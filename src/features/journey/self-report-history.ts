import { z } from "zod";
export const selfReportHistoryQuerySchema = z
  .object({
    before: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict();
export const selfReportHistoryPageSchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    events: z.array(
      z
        .object({
          id: z.string().uuid(),
          goalId: z.string().uuid(),
          sourceEventId: z.string().uuid(),
          occurredAt: z.string().datetime({ offset: true }),
          receivedAt: z.string().datetime({ offset: true }),
        })
        .strict()
        .refine((e) => Date.parse(e.occurredAt) <= Date.parse(e.receivedAt)),
    ),
    nextCursor: z.string().uuid().nullable(),
  })
  .strict()
  .refine(
    (page) =>
      new Set(page.events.map((e) => e.id)).size === page.events.length &&
      new Set(page.events.map((e) => e.sourceEventId)).size === page.events.length &&
      (page.nextCursor === null || page.nextCursor === page.events.at(-1)?.id),
  );
