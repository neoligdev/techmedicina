import { z } from "zod";
import { medicalEvolutionResultSchema } from "./evolution-api-contract";
const instant = z
  .string()
  .datetime({ offset: true })
  .refine((v) => (v.match(/\.(\d+)/)?.[1]?.length ?? 0) <= 3);
export const medicalHistoryCursorSchema = z
  .object({ recordedAt: instant, id: z.string().uuid() })
  .strict();
export const medicalEvolutionHistorySchema = z
  .object({
    items: z.array(medicalEvolutionResultSchema.extend({ recordedAt: instant })).max(100),
    nextCursor: medicalHistoryCursorSchema.nullable(),
  })
  .strict();
