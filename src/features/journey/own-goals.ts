import { z } from "zod";
export const ownGoalsQuerySchema = z
  .object({
    after: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict();
export const ownGoalSchema = z
  .object({
    id: z.string().uuid(),
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
    version: z.number().int().positive(),
    effectiveFrom: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict()
  .refine((g) => g.expiresAt === null || Date.parse(g.expiresAt) > Date.parse(g.effectiveFrom));
/** Snapshot of persisted goals, never a prescription or permission to self-report. */
export const ownGoalsPageSchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    goals: z.array(ownGoalSchema),
    nextCursor: z.string().uuid().nullable(),
  })
  .strict()
  .refine(
    (p) =>
      new Set(p.goals.map((g) => g.id)).size === p.goals.length &&
      (p.nextCursor === null || p.nextCursor === p.goals.at(-1)?.id) &&
      p.goals.every((g, i) => i === 0 || p.goals[i - 1]!.id.toLowerCase() < g.id.toLowerCase()),
  );
