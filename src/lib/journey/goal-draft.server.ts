import "@tanstack/react-start/server-only";
import { z } from "zod";
import { journeyGoalDraftInputSchema } from "@/features/journey/goal-draft";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";
const storedDraft = z
  .object({
    id: z.string().uuid(),
    clinic_id: z.string().uuid(),
    patient_id: z.string().uuid(),
    patient_user_id: z.string().uuid(),
    actor_user_id: z.string().uuid(),
    source_request_id: z.string().uuid(),
    kind: journeyGoalDraftInputSchema.shape.kind,
    cadence: journeyGoalDraftInputSchema.shape.cadence,
    state: z.literal("draft"),
    created_at: z.string().datetime({ offset: true }),
  })
  .strict();
/** Host/session verified context; same-bearer SQL RPC rechecks current grants/patient.
 * This operation never approves a proposal or changes live goals.
 */
export async function createJourneyGoalDraft(
  context: AuthContext,
  value: unknown,
  rpc: (args: {
    p_clinic_id: string;
    p_patient_id: string;
    p_source_request_id: string;
    p_kind: string;
    p_cadence: string;
  }) => Promise<unknown>,
) {
  const links = context.identity.links.filter(
    (link) => link.clinicId === context.currentClinicId && link.isActive,
  );
  const link = links[0];
  if (
    !context.currentClinicId ||
    links.length !== 1 ||
    link?.role !== "medico" ||
    !link.medicalIdentityVerified ||
    !["read", "create"].every((action) =>
      link.grants.some((grant) => grant.resource === "journey_goals" && grant.action === action),
    )
  )
    throw new AuthError("Draft denied", 403);
  const input = journeyGoalDraftInputSchema.safeParse(value);
  if (!input.success) throw new AuthError("Invalid draft", 400);
  const saved = storedDraft.parse(
    await rpc({
      p_clinic_id: context.currentClinicId,
      p_patient_id: input.data.patientId,
      p_source_request_id: input.data.sourceRequestId,
      p_kind: input.data.kind,
      p_cadence: input.data.cadence,
    }),
  );
  if (
    saved.clinic_id !== context.currentClinicId ||
    saved.patient_id !== input.data.patientId ||
    saved.actor_user_id !== context.identity.userId ||
    saved.source_request_id !== input.data.sourceRequestId ||
    saved.kind !== input.data.kind ||
    saved.cadence !== input.data.cadence
  )
    throw new Error("Unconfirmed draft");
  return {
    id: saved.id,
    clinicId: saved.clinic_id,
    patientId: saved.patient_id,
    sourceRequestId: saved.source_request_id,
    kind: saved.kind,
    cadence: saved.cadence,
    state: saved.state,
    createdAt: new Date(saved.created_at).toISOString(),
  };
}
