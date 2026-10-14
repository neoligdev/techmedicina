import "@tanstack/react-start/server-only";
import { z } from "zod";
import { AuthError } from "../auth/guards.server";
import { patientShieldStateSchema, shieldHistoryEventSchema } from "@/features/journey/contracts";
import { ShieldService } from "@/features/journey/shield-service";

function mapRow(
  value: unknown,
  history: boolean,
  clinicId: string,
  patientId: string,
  userId: string,
) {
  const row = z.record(z.unknown()).parse(value);
  if (
    row["clinic_id"] !== clinicId ||
    row["patient_id"] !== patientId ||
    row["patient_user_id"] !== userId
  )
    throw new Error("Unexpected shield row scope");
  const mapped: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(row)) {
    if (["patient_user_id", "updated_at", "created_at"].includes(key)) continue;
    const name = key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
    mapped[name] = ["occurredAt", "evaluatedAt"].includes(name)
      ? new Date(z.string().datetime({ offset: true }).parse(item)).toISOString()
      : item;
  }
  return history ? shieldHistoryEventSchema.parse(mapped) : patientShieldStateSchema.parse(mapped);
}
/** Inject transport bound to the patient's verified bearer, never service-role. */
export function createOwnShieldRpcReader(
  userId: string,
  transport: (
    name: "tm_get_patient_shield_overview",
    args: { p_clinic_id: string; p_patient_id: string },
  ) => Promise<{ data: unknown; error: { code?: string } | null }>,
) {
  z.string().uuid().parse(userId);
  return async (clinicId: string, patientId: string) => {
    const { data, error } = await transport("tm_get_patient_shield_overview", {
      p_clinic_id: clinicId,
      p_patient_id: patientId,
    });
    if (error) {
      if (error.code === "42501") throw new AuthError("Shield access denied", 403);
      throw new Error("Shields unavailable");
    }
    const payload = z
      .object({ state: z.unknown().nullable(), history: z.array(z.unknown()) })
      .strict()
      .parse(data);
    const state =
      payload.state === null
        ? null
        : patientShieldStateSchema.parse(mapRow(payload.state, false, clinicId, patientId, userId));
    const history = payload.history.map((row) =>
      shieldHistoryEventSchema.parse(mapRow(row, true, clinicId, patientId, userId)),
    );
    if (!state && history.length) throw new Error("Inconsistent shield overview");
    const service = new ShieldService({
      getState: async () => state,
      getHistory: async () => history,
      saveTransition: async () => {
        throw new Error("Read-only shield repository");
      },
    });
    return service.getPatientShieldOverview(clinicId, patientId, {
      userId,
      role: "paciente",
      clinicId,
      patientId,
    });
  };
}
