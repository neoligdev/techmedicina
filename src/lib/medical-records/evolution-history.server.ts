import "@tanstack/react-start/server-only";
import { z } from "zod";
import {
  evolutionScopeSchema,
  evolutionAuthorSchema,
  encryptedEvolutionSchema,
} from "@/features/medical-records/evolution-contract";
import type { ClinicalKeyProvider } from "@/lib/security/clinical-crypto.server";
import { openMedicalEvolution } from "./open-evolution.server";
const instant = z
  .string()
  .datetime({ offset: true })
  .refine((v) => (v.match(/\.(\d+)/)?.[1]?.length ?? 0) <= 3);
export const medicalHistoryCursorSchema = z
  .object({ recordedAt: instant, id: z.string().uuid() })
  .strict();
const pageSchema = z
  .object({
    items: z.array(encryptedEvolutionSchema).max(100),
    nextCursor: medicalHistoryCursorSchema.nullable(),
  })
  .strict();
type Cursor = z.infer<typeof medicalHistoryCursorSchema>;
const compare = (a: { recordedAt: string; id: string }, b: { recordedAt: string; id: string }) =>
  Date.parse(a.recordedAt) - Date.parse(b.recordedAt) ||
  (a.id.toLowerCase() < b.id.toLowerCase() ? -1 : a.id.toLowerCase() > b.id.toLowerCase() ? 1 : 0);
export function createMedicalEvolutionHistory(providers: {
  authorize: (scope: { clinicId: string; patientId: string }) => Promise<unknown>;
  keys: ClinicalKeyProvider;
  list: (
    scope: { clinicId: string; patientId: string },
    request: { before: Cursor | null; limit: number },
  ) => Promise<unknown>;
}) {
  return async (scopeValue: unknown, cursorValue: unknown = null) => {
    const scope = evolutionScopeSchema.parse(scopeValue),
      before = medicalHistoryCursorSchema.nullable().parse(cursorValue);
    const reader = evolutionAuthorSchema.parse(await providers.authorize({ ...scope }));
    const page = pageSchema.parse(await providers.list({ ...scope }, { before, limit: 100 }));
    let previous: Cursor | null = before;
    for (const row of page.items) {
      instant.parse(row.recordedAt);
      if (
        row.clinicId !== scope.clinicId ||
        row.patientId !== scope.patientId ||
        (previous !== null && compare(row, previous) >= 0)
      )
        throw new Error("Unexpected medical history page");
      previous = { recordedAt: row.recordedAt, id: row.id };
    }
    if (
      page.nextCursor !== null &&
      (page.items.length !== 100 || previous === null || compare(page.nextCursor, previous) !== 0)
    )
      throw new Error("Unexpected medical history cursor");
    const items = [];
    for (const row of page.items)
      items.push({
        id: row.id,
        ...scope,
        ...(await openMedicalEvolution(providers.keys, row, scope, row.id)),
      });
    if (
      evolutionAuthorSchema.parse(await providers.authorize({ ...scope })).userId !== reader.userId
    )
      throw new Error("Medical session changed");
    return { items, nextCursor: page.nextCursor };
  };
}
/** Explicit trusted actor/transport. No browser session can call this private RPC directly. */
export function createMedicalEvolutionHistoryStore(
  actorValue: unknown,
  rpc: (name: "tm_list_medical_evolutions", args: Record<string, unknown>) => Promise<unknown>,
) {
  const actor = z.string().uuid().parse(actorValue);
  return (
    scope: { clinicId: string; patientId: string },
    request: { before: Cursor | null; limit: number },
  ) =>
    rpc("tm_list_medical_evolutions", {
      p_actor: actor,
      p_clinic: scope.clinicId,
      p_patient: scope.patientId,
      p_limit: request.limit,
      ...(request.before
        ? { p_before_recorded_at: request.before.recordedAt, p_before_id: request.before.id }
        : {}),
    });
}
