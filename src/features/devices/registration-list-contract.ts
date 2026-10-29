import { z } from "zod";
export const deviceRegistrationListQuerySchema = z
  .object({
    q: z.string().trim().max(160).default(""),
    after: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(50).default(25),
  })
  .strict();
export const deviceRegistrationListPageSchema = z
  .object({
    query: z.string().max(160),
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            status: z.literal("draft"),
            title: z.string().min(1).max(160),
            model: z.string().max(160),
            claimedIdentifier: z.string().max(200),
            firmwareVersion: z.string().max(160),
            integrationAuthorized: z.literal(false),
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
