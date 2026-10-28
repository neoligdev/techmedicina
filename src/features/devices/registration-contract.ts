import { z } from "zod";
/** Declared administrative metadata only; no verified hardware identity or authorization. */
export const deviceRegistrationDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    manufacturer: z.string().max(160).default(""),
    model: z.string().max(160).default(""),
    claimedIdentifier: z.string().max(200).default(""),
    firmwareVersion: z.string().max(160).default(""),
    lot: z.string().max(160).default(""),
    notes: z.string().max(4000).default(""),
  })
  .strict();
export const deviceRegistrationWriteSchema = z
  .object({
    id: z.string().uuid(),
    expectedRevision: z.number().int().min(0).max(2147483646),
    document: deviceRegistrationDocumentSchema,
  })
  .strict();
export const savedDeviceRegistrationSchema = z
  .object({
    id: z.string().uuid(),
    status: z.literal("draft"),
    integrationAuthorized: z.literal(false),
    document: deviceRegistrationDocumentSchema,
    revision: z.number().int().positive().max(2147483647),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((v) => Date.parse(v.createdAt) <= Date.parse(v.updatedAt));
