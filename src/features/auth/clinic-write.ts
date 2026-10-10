import { z } from "zod";

const fields = { name: z.string().trim().min(2).max(160), isActive: z.boolean() };
export const clinicWriteSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), ...fields }).strict(),
  z
    .object({
      operation: z.literal("update"),
      ...fields,
      id: z.string().uuid(),
      expectedRevision: z.number().int().min(1).max(2147483646),
    })
    .strict(),
]);
export const savedClinicSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(2).max(160),
    is_active: z.boolean(),
    created_at: z.string().datetime({ offset: true }),
    revision: z.number().int().positive(),
  })
  .strict();
export type ClinicWrite = z.infer<typeof clinicWriteSchema>;
