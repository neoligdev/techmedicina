import { z } from "zod";
const revision = z.number().int().positive().max(2147483647);
export const blogVersionListQuerySchema = z
  .object({
    id: z.string().uuid(),
    before: revision.optional(),
    limit: z.number().int().min(1).max(50).default(10),
  })
  .strict();
export const blogVersionListPageSchema = z
  .object({
    draftId: z.string().uuid(),
    items: z
      .array(
        z
          .object({
            revision,
            title: z.string().min(1).max(160),
            occurredAt: z.string().datetime({ offset: true }),
          })
          .strict(),
      )
      .max(50),
    nextCursor: revision.nullable(),
  })
  .strict()
  .refine(
    (p) =>
      (p.nextCursor === null || p.nextCursor === p.items.at(-1)?.revision) &&
      p.items.every((v, i) => i === 0 || p.items[i - 1]!.revision > v.revision),
  );
export function validateBlogVersionPage(
  raw: unknown,
  input: z.infer<typeof blogVersionListQuerySchema>,
) {
  const page = blogVersionListPageSchema.parse(raw);
  if (
    page.draftId !== input.id ||
    page.items.length > input.limit ||
    (page.nextCursor !== null && page.items.length !== input.limit) ||
    page.items.some((i) => input.before !== undefined && i.revision >= input.before)
  )
    throw new Error("Unexpected version page");
  return page;
}
