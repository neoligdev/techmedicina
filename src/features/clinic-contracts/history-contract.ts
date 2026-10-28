import { z } from "zod";
import { clinicContractDocumentSchema } from "./contracts";
export const contractVersionQuerySchema = z
  .object({
    id: z.string().uuid(),
    clinicId: z.string().uuid(),
    revision: z.number().int().positive().max(2147483647),
  })
  .strict();
export const contractVersionSchema = z
  .object({
    draftId: z.string().uuid(),
    clinicId: z.string().uuid(),
    revision: z.number().int().positive().max(2147483647),
    document: clinicContractDocumentSchema,
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();
const revision = z.number().int().positive().max(2147483647);
export const contractVersionListQuerySchema = z
  .object({
    id: z.string().uuid(),
    clinicId: z.string().uuid(),
    before: revision.optional(),
    limit: z.number().int().min(1).max(50).default(10),
  })
  .strict();
export const contractVersionListPageSchema = z
  .object({
    draftId: z.string().uuid(),
    clinicId: z.string().uuid(),
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
export function validateContractVersionPage(
  raw: unknown,
  input: z.infer<typeof contractVersionListQuerySchema>,
) {
  const page = contractVersionListPageSchema.parse(raw);
  if (
    page.draftId !== input.id ||
    page.clinicId !== input.clinicId ||
    page.items.length > input.limit ||
    (page.nextCursor !== null && page.items.length !== input.limit) ||
    page.items.some((i) => input.before !== undefined && i.revision >= input.before)
  )
    throw new Error("Unexpected version page");
  return page;
}
