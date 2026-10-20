import { z } from "zod";
import { isValidIanaTimeZone } from "@/features/agenda/local-time";

const timeZoneSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine((val) => val === undefined || val === null || val === "" || isValidIanaTimeZone(val), {
    message: "Fuso horário IANA inválido",
  })
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null || val === "") return null;
    return val;
  });

const fields = {
  name: z.string().trim().min(2).max(160),
  isActive: z.boolean(),
  timeZone: timeZoneSchema,
};

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
    time_zone: z.string().nullable().optional(),
    created_at: z.string().datetime({ offset: true }),
    revision: z.number().int().positive(),
  })
  .strict();
export type ClinicWrite = z.infer<typeof clinicWriteSchema>;
