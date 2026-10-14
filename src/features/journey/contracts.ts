import { z } from "zod";

// Server-owned goal snapshot. A prescription reference is not proof of a valid prescription.
export const journeyGoalSchema = z
  .object({
    id: z.string().uuid(),
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    version: z.number().int().positive(),
    policyVersionId: z.string().uuid(),
    kind: z.enum([
      "hydration",
      "nutrition",
      "sleep",
      "emotion",
      "medication",
      "activity",
      "check_in",
      "protocol",
    ]),
    cadence: z.enum(["daily", "weekly"]),
    status: z.enum(["eligible", "not_applicable", "paused"]),
    prescriptionId: z.string().uuid().nullable(),
    effectiveFrom: z.string().datetime(),
  })
  .strict()
  .refine((goal) => goal.kind !== "medication" || goal.prescriptionId !== null, {
    message: "Medication goal requires a prescription reference",
  });

// Client submission cannot set tenant, patient, author, eligibility, score or device provenance.
export const journeySelfReportInputSchema = z
  .object({
    goalId: z.string().uuid(),
    sourceEventId: z.string().uuid(),
    occurredAt: z.string().datetime(),
  })
  .strict();

export const journeyEventSchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    goalId: z.string().uuid(),
    goalVersion: z.number().int().positive(),
    policyVersionId: z.string().uuid(),
    sourceEventId: z.string().uuid(),
    source: z.literal("self_report"),
    actorUserId: z.string().uuid(),
    occurredAt: z.string().datetime(),
    receivedAt: z.string().datetime(),
  })
  .strict();

export type JourneyGoal = z.infer<typeof journeyGoalSchema>;
export type JourneyEvent = z.infer<typeof journeyEventSchema>;

// Clinic, patient account and audit actor are derived by the authenticated repository.
export const journeyPreferenceInputSchema = z
  .object({
    patientId: z.string().uuid(),
    isEnabled: z.boolean(),
    expectedRevision: z.number().int().nonnegative(),
  })
  .strict();
