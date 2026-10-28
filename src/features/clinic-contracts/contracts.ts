import { z } from "zod";
// Draft-only technical bounds. Null means undecided, never a zero price or an enabled benefit.
export const draftMoneySchema = z.number().int().min(0).max(999999999999).nullable();
export const clinicContractDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    currency: z.literal("BRL"),
    setupCents: draftMoneySchema,
    monthlyEnabled: z.boolean().nullable(),
    monthlyCents: draftMoneySchema,
    livesEnabled: z.boolean().nullable(),
    livesCount: z.number().int().min(0).max(2147483647).nullable(),
    holderCents: draftMoneySchema,
    dependentCents: draftMoneySchema,
    notes: z.string().max(4000),
  })
  .strict();
export const clinicContractScopeSchema = z
  .object({ id: z.string().uuid(), clinicId: z.string().uuid() })
  .strict();
export const clinicContractWriteSchema = clinicContractScopeSchema
  .extend({
    expectedRevision: z.number().int().min(0).max(2147483646),
    document: clinicContractDocumentSchema,
  })
  .strict();
export const savedClinicContractSchema = clinicContractScopeSchema
  .extend({
    status: z.literal("draft"),
    revision: z.number().int().positive().max(2147483647),
    document: clinicContractDocumentSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((v) => Date.parse(v.createdAt) <= Date.parse(v.updatedAt));
export const emptyClinicContract = () =>
  clinicContractDocumentSchema.parse({
    title: "Contrato de uso da clínica — rascunho",
    currency: "BRL",
    setupCents: null,
    monthlyEnabled: null,
    monthlyCents: null,
    livesEnabled: null,
    livesCount: null,
    holderCents: null,
    dependentCents: null,
    notes: "",
  });
