import { z } from "zod";
import { journeyEventSchema } from "@/features/journey/contracts";

const storedEventSchema = z
  .object({
    id: z.string().uuid(),
    clinic_id: z.string().uuid(),
    patient_id: z.string().uuid(),
    goal_id: z.string().uuid(),
    goal_version: z.number().int().positive(),
    policy_version_id: z.string().uuid(),
    source_event_id: z.string().uuid(),
    source: z.literal("self_report"),
    actor_user_id: z.string().uuid(),
    occurred_at: z.string().datetime({ offset: true }),
    received_at: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((row) => Date.parse(row.occurred_at) <= Date.parse(row.received_at), {
    message: "Event occurs after receipt",
  });

/** Parsing is not authorization: callers must use the authenticated RPC/RLS. */
export function parsePersistedJourneyEvent(value: unknown) {
  const row = storedEventSchema.parse(value);
  return {
    id: row.id,
    event: journeyEventSchema.parse({
      clinicId: row.clinic_id,
      patientId: row.patient_id,
      goalId: row.goal_id,
      goalVersion: row.goal_version,
      policyVersionId: row.policy_version_id,
      sourceEventId: row.source_event_id,
      source: row.source,
      actorUserId: row.actor_user_id,
      occurredAt: new Date(row.occurred_at).toISOString(),
      receivedAt: new Date(row.received_at).toISOString(),
    }),
  };
}
