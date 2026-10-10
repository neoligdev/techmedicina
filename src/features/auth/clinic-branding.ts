import { z } from "zod";
import { validImageBase64 } from "../demo/personalization";

const image = z.string().max(275000).refine(validImageBase64, "Imagem inválida").optional();
export const clinicBrandingPreferencesSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(80)
      .refine((value) => value.trim().length > 0),
    primary: z.string().regex(/^#[0-9a-f]{6}$/i),
    secondary: z.string().regex(/^#[0-9a-f]{6}$/i),
    mode: z.enum(["light", "dark"]),
    logo: image,
    favicon: image,
  })
  .strict();
export const clinicBrandingWriteSchema = z
  .object({
    clinicId: z.string().uuid(),
    preferences: clinicBrandingPreferencesSchema,
    expectedRevision: z.number().int().min(0).max(2147483646),
  })
  .strict();
export const savedClinicBrandingSchema = z
  .object({
    clinic_id: z.string().uuid(),
    preferences: clinicBrandingPreferencesSchema,
    revision: z.number().int().positive(),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict();
