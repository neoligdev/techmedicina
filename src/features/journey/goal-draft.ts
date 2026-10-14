import { z } from "zod";
/** Proposal only: cadence is not an approved clinical schedule or eligibility. */
export const journeyGoalDraftInputSchema = z
  .object({
    patientId: z.string().uuid(),
    sourceRequestId: z.string().uuid(),
    kind: z.enum(["hydration", "nutrition", "sleep", "emotion", "activity", "check_in"]),
    cadence: z.enum(["daily", "weekly"]),
  })
  .strict();
export type JourneyGoalDraftInput = z.infer<typeof journeyGoalDraftInputSchema>;
