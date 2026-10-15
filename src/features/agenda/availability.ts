import { z } from "zod";

/** Explicit instants only: never infer consultation duration or browser timezone. */
export const availabilityIntervalSchema = z
  .object({
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    message: "O término deve ser posterior ao início",
    path: ["endsAt"],
  });
export const availabilityProposalSchema = z
  .object({
    sourceRequestId: z.string().uuid(),
    interval: availabilityIntervalSchema,
  })
  .strict();
export type AvailabilityInterval = z.infer<typeof availabilityIntervalSchema>;

/** Half-open intervals allow adjacent slots. Persisted conflicts need DB locking. */
export function availabilityOverlaps(first: AvailabilityInterval, second: AvailabilityInterval) {
  const a = availabilityIntervalSchema.parse(first),
    b = availabilityIntervalSchema.parse(second);
  return (
    Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt)
  );
}
