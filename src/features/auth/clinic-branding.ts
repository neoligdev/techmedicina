import { z } from "zod";
import { validImageBase64, validTextureUrl } from "../demo/personalization";

const image = z.string().max(275000).refine(validImageBase64, "Imagem inválida").optional();

export const customTextureSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(60),
    url: z.string().min(1).max(7000000).refine(validTextureUrl, "Textura inválida"),
    createdAt: z.string(),
  })
  .strict();

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
    textureId: z.string().max(64).optional(),
    textureUrl: z.string().max(7000000).refine(validTextureUrl, "Textura inválida").optional(),
    customTextures: z.array(customTextureSchema).max(20).optional(),
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
