import { z } from "zod";
export const goalPauseInputSchema = z
  .object({
    goalId: z.string().uuid(),
    expectedVersion: z.number().int().positive().max(2147483647),
  })
  .strict();
export const goalPauseReceiptSchema = z
  .object({
    goalId: z.string().uuid(),
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    status: z.literal("paused"),
    version: z.number().int().positive(),
  })
  .strict();
export const journeyGoalViewSchema = z
  .object({
    goalId: z.string().uuid(),
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    title: z.string().min(1).max(120),
    status: z.enum(["eligible", "not_applicable", "paused"]),
    version: z.number().int().positive(),
  })
  .strict();
export type JourneyGoalView = z.infer<typeof journeyGoalViewSchema>;
export class JourneyGoalPauseConflict extends Error {}
