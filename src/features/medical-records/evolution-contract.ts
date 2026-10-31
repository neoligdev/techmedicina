import { z } from "zod";
export const evolutionCommandSchema = z
  .object({
    id: z.string().uuid(),
    text: z
      .string()
      .min(1)
      .max(60000)
      .refine((v) => v.trim().length > 0),
    supplementsId: z.string().uuid().nullable(),
  })
  .strict();
export const evolutionAuthorSchema = z
  .object({
    userId: z.string().uuid(),
    name: z.string().min(1).max(200),
    crm: z.string().min(1).max(40),
    uf: z.string().regex(/^[A-Z]{2}$/),
  })
  .strict();
export const evolutionScopeSchema = z
  .object({ clinicId: z.string().uuid(), patientId: z.string().uuid() })
  .strict();
export const evolutionPayloadSchema = z
  .object({
    text: z.string().min(1).max(60000),
    author: evolutionAuthorSchema,
    recordedAt: z.string().datetime({ offset: true }),
    supplementsId: z.string().uuid().nullable(),
  })
  .strict();
export const encryptedEvolutionSchema = evolutionScopeSchema
  .extend({
    id: z.string().uuid(),
    authorUserId: z.string().uuid(),
    recordedAt: z.string().datetime({ offset: true }),
    supplementsId: z.string().uuid().nullable(),
    envelope: z
      .object({
        version: z.literal(1),
        alg: z.literal("A256GCM"),
        kid: z.string().min(1).max(256),
        iv: z.string().length(16),
        ciphertext: z.string().min(24).max(349548),
      })
      .strict(),
  })
  .strict();
export type EncryptedEvolution = z.infer<typeof encryptedEvolutionSchema>;
