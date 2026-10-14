import "@tanstack/react-start/server-only";
import { z } from "zod";
import { journeyPreferenceInputSchema } from "@/features/journey/contracts";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";

const savedPreferenceSchema = z
  .object({
    clinic_id: z.string().uuid(),
    patient_id: z.string().uuid(),
    patient_user_id: z.string().uuid(),
    is_enabled: z.boolean(),
    revision: z.number().int().nonnegative(),
  })
  .strict()
  .refine((row) => row.revision !== 0 || !row.is_enabled, {
    message: "Invalid initial preference",
  });

type PreferenceRpc = (
  name: "tm_set_journey_preference",
  args: {
    p_patient_id: string;
    p_is_enabled: boolean;
    p_expected_revision: number;
  },
) => Promise<unknown>;

/** Context must be server-verified and host-bound; RPC uses that same authenticated session.
 * SQL remains the authority for active clinic/patient, current grants and audit writes.
 */
export async function saveJourneyPreference(
  context: AuthContext,
  value: unknown,
  rpc: PreferenceRpc,
) {
  const input = journeyPreferenceInputSchema.safeParse(value);
  if (!input.success) throw new AuthError("Invalid preference input", 400);
  const link = context.identity.links.find(
    (item) =>
      item.clinicId === context.currentClinicId &&
      item.patientId === input.data.patientId &&
      item.role === "paciente" &&
      item.isActive,
  );
  if (
    !context.currentClinicId ||
    !link ||
    (input.data.isEnabled &&
      !link.grants.some(
        (grant) => grant.resource === "journey_events" && grant.action === "create",
      ))
  ) {
    throw new AuthError("Participation denied", 403);
  }
  const raw = await rpc("tm_set_journey_preference", {
    p_patient_id: input.data.patientId,
    p_is_enabled: input.data.isEnabled,
    p_expected_revision: input.data.expectedRevision,
  });
  const saved = savedPreferenceSchema.parse(raw);
  if (
    saved.revision === 0 ||
    saved.clinic_id !== context.currentClinicId ||
    saved.patient_id !== input.data.patientId ||
    saved.patient_user_id !== context.identity.userId ||
    saved.is_enabled !== input.data.isEnabled ||
    ![input.data.expectedRevision, input.data.expectedRevision + 1].includes(saved.revision)
  ) {
    throw new Error("Invalid persisted preference response");
  }
  return {
    clinicId: saved.clinic_id,
    patientId: saved.patient_id,
    isEnabled: saved.is_enabled,
    revision: saved.revision,
  };
}

export async function readJourneyPreference(
  context: AuthContext,
  patientId: string,
  rpc: (name: "tm_get_journey_preference", args: { p_patient_id: string }) => Promise<unknown>,
) {
  const link = context.identity.links.find(
    (item) =>
      item.clinicId === context.currentClinicId &&
      item.patientId === patientId &&
      item.role === "paciente" &&
      item.isActive,
  );
  if (!context.currentClinicId || !link || !z.string().uuid().safeParse(patientId).success)
    throw new AuthError("Participation denied", 403);
  const saved = savedPreferenceSchema.parse(
    await rpc("tm_get_journey_preference", { p_patient_id: patientId }),
  );
  if (
    saved.clinic_id !== context.currentClinicId ||
    saved.patient_id !== patientId ||
    saved.patient_user_id !== context.identity.userId
  )
    throw new Error("Invalid persisted preference response");
  return {
    clinicId: saved.clinic_id,
    patientId: saved.patient_id,
    isEnabled: saved.is_enabled,
    revision: saved.revision,
  };
}
