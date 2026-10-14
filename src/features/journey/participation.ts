import { z } from "zod";
export const journeyParticipationSchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    isEnabled: z.boolean(),
    revision: z.number().int().nonnegative(),
  })
  .strict()
  .refine((value) => value.revision !== 0 || !value.isEnabled);
export type JourneyParticipation = z.infer<typeof journeyParticipationSchema>;
export class JourneyParticipationConflict extends Error {}
