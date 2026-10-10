import { z } from "zod";

export const clinicRowsSchema = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(2).max(160),
        is_active: z.boolean(),
        created_at: z.string().datetime({ offset: true }),
      })
      .strict(),
  )
  .max(101);
export const clinicDirectorySchema = z
  .object({
    clinics: clinicRowsSchema.max(100),
    hasMore: z.boolean(),
  })
  .strict();
export type ClinicDirectory = z.infer<typeof clinicDirectorySchema>;
