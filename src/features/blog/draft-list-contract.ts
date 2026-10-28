import { z } from "zod";
export const blogDraftListQuerySchema = z
  .object({
    q: z.string().trim().max(160).default(""),
    after: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(50).default(25),
  })
  .strict();
export const blogDraftListPageSchema = z
  .object({
    query: z.string().max(160),
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            status: z.literal("draft"),
            title: z.string().min(1).max(160),
            category: z.string().max(80),
            revision: z.number().int().positive().max(2147483647),
            updatedAt: z.string().datetime({ offset: true }),
          })
          .strict(),
      )
      .max(50),
    nextCursor: z.string().uuid().nullable(),
  })
  .strict()
  .refine(
    (p) =>
      new Set(p.items.map((i) => i.id)).size === p.items.length &&
      (p.nextCursor === null || p.nextCursor === p.items.at(-1)?.id) &&
      p.items.every(
        (item, i) => i === 0 || p.items[i - 1]!.id.toLowerCase() < item.id.toLowerCase(),
      ),
  );
