import { z } from "zod";
/** Technical draft limits, not a clinical/editorial approval or a media policy. Plain text only. */
export const blogDraftDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    summary: z.string().max(1200).default(""),
    body: z.string().max(20000).default(""),
    category: z.string().max(80).default(""),
    authorName: z.string().max(200).default(""),
    references: z.string().max(4000).default(""),
    license: z.string().max(400).default(""),
  })
  .strict();
export const blogDraftWriteSchema = z
  .object({
    id: z.string().uuid(),
    expectedRevision: z.number().int().min(0).max(2147483646),
    document: blogDraftDocumentSchema,
  })
  .strict();
export const savedBlogDraftSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal("draft"),
    document: blogDraftDocumentSchema,
    revision: z.number().int().positive().max(2147483647),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((v) => Date.parse(v.createdAt) <= Date.parse(v.updatedAt));
