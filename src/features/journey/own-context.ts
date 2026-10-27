import { z } from "zod";
/** Minimal own-patient scope. Auth user ID is deliberately not a patient identifier. */
export const ownJourneyContextSchema = z
  .object({ clinicId: z.string().uuid(), patientId: z.string().uuid() })
  .strict();
export type OwnJourneyContext = z.infer<typeof ownJourneyContextSchema>;
