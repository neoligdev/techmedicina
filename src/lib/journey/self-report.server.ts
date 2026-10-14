import "@tanstack/react-start/server-only";
import {
  journeyGoalSchema,
  journeySelfReportInputSchema,
  journeyEventSchema,
} from "@/features/journey/contracts";
import { isAuthorized, type AuthContext, type PatientLinkMeta } from "../auth/core";
import { AuthError } from "../auth/guards.server";

/** Local assembly contract only. Goal and patient link must come from a trusted repository.
 * Persistence, consent/prescription verification and deduplication are future VJE-2 gates.
 */
export function buildJourneySelfReport(
  context: AuthContext,
  input: unknown,
  trustedGoal: unknown,
  patientLink: PatientLinkMeta,
  receivedAt: string,
) {
  const goal = journeyGoalSchema.parse(trustedGoal);
  const submission = journeySelfReportInputSchema.parse(input);
  if (
    submission.goalId !== goal.id ||
    goal.status !== "eligible" ||
    goal.kind === "medication" ||
    goal.kind === "protocol" ||
    !isAuthorized(context, "journey_events", "create", {
      ownerClinicId: goal.clinicId,
      ownerPatientId: goal.patientId,
      patientLink,
    })
  )
    throw new AuthError("Participation denied", 403);
  if (
    Date.parse(submission.occurredAt) < Date.parse(goal.effectiveFrom) ||
    Date.parse(submission.occurredAt) > Date.parse(receivedAt)
  )
    throw new AuthError("Invalid event time", 400);
  return journeyEventSchema.parse({
    clinicId: goal.clinicId,
    patientId: goal.patientId,
    goalId: goal.id,
    goalVersion: goal.version,
    policyVersionId: goal.policyVersionId,
    sourceEventId: submission.sourceEventId,
    source: "self_report",
    actorUserId: context.identity.userId,
    occurredAt: submission.occurredAt,
    receivedAt,
  });
}
