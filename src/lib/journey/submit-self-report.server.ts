import "@tanstack/react-start/server-only";
import { journeySelfReportInputSchema } from "@/features/journey/contracts";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { parsePersistedJourneyEvent } from "./persisted-event";

/** Context comes from the patient host/session resolver. RPC keeps the same bearer
 * and transactionally validates host clinic, own patient, grant and eligibility.
 */
export async function submitJourneySelfReport(
  context: AuthContext,
  value: unknown,
  rpc: (args: {
    p_clinic_id: string;
    p_goal_id: string;
    p_source_event_id: string;
    p_occurred_at: string;
  }) => Promise<unknown>,
) {
  const links = context.identity.links.filter(
    (link) => link.isActive && link.clinicId === context.currentClinicId,
  );
  const link = links[0];
  if (
    !context.currentClinicId ||
    links.length !== 1 ||
    link?.role !== "paciente" ||
    !link.patientId ||
    !link.grants.some((grant) => grant.resource === "journey_events" && grant.action === "create")
  )
    throw new AuthError("Participation denied", 403);
  const input = journeySelfReportInputSchema.safeParse(value);
  if (!input.success) throw new AuthError("Invalid event input", 400);
  const saved = parsePersistedJourneyEvent(
    await rpc({
      p_clinic_id: context.currentClinicId,
      p_goal_id: input.data.goalId,
      p_source_event_id: input.data.sourceEventId,
      p_occurred_at: input.data.occurredAt,
    }),
  );
  const event = saved.event;
  if (
    event.clinicId !== context.currentClinicId ||
    event.patientId !== link.patientId ||
    event.actorUserId !== context.identity.userId ||
    event.goalId !== input.data.goalId ||
    event.sourceEventId !== input.data.sourceEventId ||
    Date.parse(event.occurredAt) !== Date.parse(input.data.occurredAt)
  )
    throw new Error("Unconfirmed self-report");
  // Minimal acknowledgement; internal actor and policy versions are not browser DTOs.
  return {
    id: saved.id,
    clinicId: event.clinicId,
    patientId: event.patientId,
    goalId: event.goalId,
    sourceEventId: event.sourceEventId,
    occurredAt: event.occurredAt,
  };
}
