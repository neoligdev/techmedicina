import "@tanstack/react-start/server-only";
import { z } from "zod";
import { isAuthorized, type AuthContext, type PatientLinkMeta } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { goalPauseInputSchema } from "@/features/journey/goal-pause";

export const storedGoalSchema = z
  .object({
    id: z.string().uuid(),
    clinic_id: z.string().uuid(),
    patient_id: z.string().uuid(),
    patient_user_id: z.string().uuid(),
    version: z.number().int().positive(),
    policy_version_id: z.string().uuid(),
    kind: z.enum([
      "hydration",
      "nutrition",
      "sleep",
      "emotion",
      "medication",
      "activity",
      "check_in",
      "protocol",
    ]),
    cadence: z.enum(["daily", "weekly"]),
    status: z.enum(["eligible", "not_applicable", "paused"]),
    effective_from: z.string().datetime({ offset: true }),
    expires_at: z.string().datetime({ offset: true }).nullable(),
  })
  .strict()
  .refine(
    (row) => row.expires_at === null || Date.parse(row.expires_at) > Date.parse(row.effective_from),
  );

/** Repository reads and RPC must retain the server-verified bearer and host clinic.
 * This operation only suspends; it cannot approve eligibility or prescriptions.
 */
export async function pauseJourneyGoal(
  context: AuthContext,
  value: unknown,
  repository: {
    read: (
      context: AuthContext,
      goalId: string,
    ) => Promise<{ goal: unknown; patientLink: PatientLinkMeta } | null>;
    pause: (
      context: AuthContext,
      args: { p_goal_id: string; p_expected_version: number },
    ) => Promise<unknown>;
  },
) {
  const input = goalPauseInputSchema.safeParse(value);
  if (!input.success) throw new AuthError("Invalid goal input", 400);
  const links = context.identity.links.filter(
    (link) => link.clinicId === context.currentClinicId && link.isActive,
  );
  const link = links[0];
  if (
    !context.currentClinicId ||
    links.length !== 1 ||
    link?.role !== "medico" ||
    !link.medicalIdentityVerified ||
    !["read", "write"].every((action) =>
      link.grants.some((grant) => grant.resource === "journey_goals" && grant.action === action),
    )
  )
    throw new AuthError("Goal access denied", 403);
  const record = await repository.read(context, input.data.goalId);
  if (!record) throw new AuthError("Goal access denied", 403);
  const before = storedGoalSchema.parse(record.goal);
  if (
    before.id !== input.data.goalId ||
    !isAuthorized(context, "journey_goals", "write", {
      ownerClinicId: before.clinic_id,
      ownerPatientId: before.patient_id,
      patientLink: record.patientLink,
    })
  )
    throw new AuthError("Goal access denied", 403);
  if (before.version !== input.data.expectedVersion)
    throw new AuthError("Goal changed; reload", 409);
  const saved = storedGoalSchema.parse(
    await repository.pause(context, {
      p_goal_id: before.id,
      p_expected_version: input.data.expectedVersion,
    }),
  );
  const expectedVersion = before.status === "paused" ? before.version : before.version + 1;
  const { version: _oldVersion, status: _oldStatus, ...oldMetadata } = before;
  const { version: _newVersion, status: _newStatus, ...newMetadata } = saved;
  if (
    saved.status !== "paused" ||
    saved.version !== expectedVersion ||
    JSON.stringify(oldMetadata) !== JSON.stringify(newMetadata)
  )
    throw new Error("Unexpected persisted goal change");
  return {
    goalId: saved.id,
    clinicId: saved.clinic_id,
    patientId: saved.patient_id,
    status: saved.status,
    version: saved.version,
  };
}
