import { z } from "zod";
import { blogDraftDocumentSchema } from "./draft-contract";
export const blogDraftVersionQuerySchema = z
  .object({ id: z.string().uuid(), revision: z.number().int().positive().max(2147483647) })
  .strict();
export const blogDraftVersionSchema = z
  .object({
    draftId: z.string().uuid(),
    revision: z.number().int().positive().max(2147483647),
    document: blogDraftDocumentSchema,
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();
