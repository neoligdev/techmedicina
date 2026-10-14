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

// Default audit weights defined as non-binding baseline in PRD v0.11.3 §11.4
export const DEFAULT_JOURNEY_WEIGHTS = {
  hydration: 10,
  nutrition: 10,
  sleep: 15,
  emotion: 10,
  medication: 20,
  activity: 20,
  check_in: 15,
  protocol: 15,
} as const;

export type JourneyGoalKind = keyof typeof DEFAULT_JOURNEY_WEIGHTS;

export const journeyScoreGoalSchema = z
  .object({
    id: z.string().uuid(),
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    version: z.number().int().positive().optional().default(1),
    policyVersionId: z.string().uuid().optional(),
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
    cadence: z.enum(["daily", "weekly"]).optional().default("daily"),
    status: z.enum(["eligible", "not_applicable", "paused"]).default("eligible"),
    prescriptionId: z.string().uuid().nullable().optional().default(null),
    effectiveFrom: z.string().datetime(),
    expiresAt: z.string().datetime().nullable().optional(),
    weight: z.number().positive().optional(),
    targetValue: z.number().positive().optional(),
    activeDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  })
  .strict()
  .refine((goal) => goal.kind !== "medication" || goal.prescriptionId !== null, {
    message: "Medication goal requires a prescription reference",
  });

export type JourneyScoreGoal = z.infer<typeof journeyScoreGoalSchema>;

export const journeyScoreEventSchema = z
  .object({
    id: z.string().uuid().optional(),
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    goalId: z.string().uuid(),
    goalVersion: z.number().int().positive().optional().default(1),
    policyVersionId: z.string().uuid().optional(),
    sourceEventId: z.string().uuid(),
    source: z.enum(["self_report", "device_smartband", "device_scale", "professional"]),
    actorUserId: z.string().uuid().optional(),
    occurredAt: z.string().datetime(),
    receivedAt: z.string().datetime().optional(),
    quantity: z.number().positive().optional(),
  })
  .strict();

export type JourneyScoreEvent = z.infer<typeof journeyScoreEventSchema>;

export const journeyScoreBreakdownSchema = z
  .object({
    goalId: z.string().uuid(),
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
    status: z.enum([
      "eligible",
      "paused",
      "not_applicable",
      "no_prescription",
      "not_yet_effective",
      "expired",
      "rest_day",
      "rejected_cross_tenant",
    ]),
    weight: z.number().nonnegative(),
    isFulfilled: z.boolean(),
    completionRatio: z.number().min(0).max(1),
    contributedWeight: z.number().nonnegative(),
    evidenceCount: z.number().int().nonnegative(),
    sources: z.array(z.string()),
    reason: z.string().optional(),
  })
  .strict();

export type JourneyScoreBreakdown = z.infer<typeof journeyScoreBreakdownSchema>;

export const journeyScoreResultSchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    evaluatedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(["evaluated", "not_evaluable"]),
    score: z.number().int().min(0).max(100).nullable(),
    totalEligibleWeight: z.number().nonnegative(),
    achievedWeight: z.number().nonnegative(),
    breakdown: z.array(journeyScoreBreakdownSchema),
    rulesVersion: z.literal("v0.11.3"),
    evaluatedAt: z.string().datetime(),
    summary: z.string(),
  })
  .strict();

export type JourneyScoreResult = z.infer<typeof journeyScoreResultSchema>;

// Definição canônica dos cinco Escudos oficiais conforme PRD v0.11.3 §11.5
export const SHIELD_IDS = ["origem", "ritmo", "avanco", "equilibrio", "plenitude"] as const;
export type ShieldId = (typeof SHIELD_IDS)[number];

export interface ShieldTierInfo {
  id: ShieldId;
  name: string;
  rank: number;
  minScore: number;
  maxScore: number;
  description: string;
}

export const SHIELD_TIERS: Record<ShieldId, ShieldTierInfo> = {
  origem: {
    id: "origem",
    name: "Origem",
    rank: 1,
    minScore: 0,
    maxScore: 29,
    description: "Início da jornada e reconhecimento da linha de base de hábitos e saúde.",
  },
  ritmo: {
    id: "ritmo",
    name: "Ritmo",
    rank: 2,
    minScore: 30,
    maxScore: 54,
    description: "Construção de constância e cadência nas rotinas de cuidado diário.",
  },
  avanco: {
    id: "avanco",
    name: "Avanço",
    rank: 3,
    minScore: 55,
    maxScore: 74,
    description: "Evolução sustentada com superação consistente das metas acordadas.",
  },
  equilibrio: {
    id: "equilibrio",
    name: "Equilíbrio",
    rank: 4,
    minScore: 75,
    maxScore: 89,
    description: "Harmonia entre saúde, rotina e bem-estar, com alto nível de adesão.",
  },
  plenitude: {
    id: "plenitude",
    name: "Plenitude",
    rank: 5,
    minScore: 90,
    maxScore: 100,
    description: "Excelência e integração completa dos pilares de saúde e vitalidade.",
  },
} as const;

export const shieldActionSchema = z.enum([
  "initial",
  "promotion",
  "maintenance",
  "regression",
  "reacquisition",
]);

export type ShieldAction = z.infer<typeof shieldActionSchema>;

// Registro imutável de conquista, promoção ou regressão (PRD v0.11.3 §11.5)
export const shieldHistoryEventSchema = z
  .object({
    id: z.string().uuid(),
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    action: shieldActionSchema,
    shield: z.enum(SHIELD_IDS),
    previousShield: z.enum(SHIELD_IDS).nullable(),
    highestShieldEarned: z.enum(SHIELD_IDS),
    idempotencyKey: z.string().optional(),
    evaluatedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    occurredAt: z.string().datetime(),
    scoreAverage: z.number().min(0).max(100).nullable(),
    evaluableDaysCount: z.number().int().min(0).max(7),
    consecutiveLowDays: z.number().int().min(0),
    vitalitySnapshot: z.string().nullable().default(null),
    rulesVersion: z.literal("v0.11.3"),
    reason: z.string(),
  })
  .strict();

export type ShieldHistoryEvent = z.infer<typeof shieldHistoryEventSchema>;

// Estado do Escudo ativo e métricas da janela móvel de 7 dias avaliáveis
export const patientShieldStateSchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    activeShield: z.enum(SHIELD_IDS),
    highestShieldEarned: z.enum(SHIELD_IDS),
    isProvisional: z.boolean(),
    scoreAverage: z.number().min(0).max(100).nullable(),
    scoreAverageRounded: z.number().int().min(0).max(100).nullable(),
    evaluableDaysCount: z.number().int().min(0).max(7),
    consecutiveLowDays: z.number().int().min(0),
    lastEvaluatedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    evaluatedAt: z.string().datetime(),
    rulesVersion: z.literal("v0.11.3"),
    recentAction: shieldActionSchema,
    reason: z.string(),
  })
  .strict();

export type PatientShieldState = z.infer<typeof patientShieldStateSchema>;

export const shieldCalculationInputSchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    evaluations: z.array(journeyScoreResultSchema),
    currentState: patientShieldStateSchema.nullable().optional(),
    existingHistory: z.array(shieldHistoryEventSchema).optional(),
    options: z
      .object({
        timeZone: z.string().optional(),
        evaluatedAt: z.string().datetime().optional(),
      })
      .optional(),
  })
  .strict();

export type ShieldCalculationInput = z.infer<typeof shieldCalculationInputSchema>;

export const shieldCalculationResultSchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    state: patientShieldStateSchema,
    historyEvent: shieldHistoryEventSchema.nullable(),
    fullHistory: z.array(shieldHistoryEventSchema),
    consideredEvaluations: z.array(journeyScoreResultSchema),
    rulesVersion: z.literal("v0.11.3"),
    summary: z.string(),
  })
  .strict();

export type ShieldCalculationResult = z.infer<typeof shieldCalculationResultSchema>;

export const shieldTierInfoSchema = z
  .object({
    id: z.enum(SHIELD_IDS),
    name: z.string(),
    rank: z.number().int().min(1).max(5),
    minScore: z.number().int().min(0).max(100),
    maxScore: z.number().int().min(0).max(100),
    description: z.string(),
  })
  .strict();

export const shieldProgressInfoSchema = z
  .object({
    currentRank: z.number().int().min(1).max(5),
    nextTierId: z.enum(SHIELD_IDS).nullable(),
    nextTierName: z.string().nullable(),
    nextTierMinScore: z.number().int().nullable(),
    pointsNeededToNextTier: z.number().int().nonnegative(),
    progressPercentage: z.number().int().min(0).max(100),
    daysRemainingInWindow: z.number().int().min(0).max(7),
    consecutiveLowDays: z.number().int().min(0),
    isAtRiskOfRegression: z.boolean(),
  })
  .strict();

export type ShieldProgressInfo = z.infer<typeof shieldProgressInfoSchema>;

export const patientShieldOverviewSchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    state: patientShieldStateSchema,
    history: z.array(shieldHistoryEventSchema),
    tierInfo: shieldTierInfoSchema,
    nextTier: shieldTierInfoSchema.nullable(),
    progress: shieldProgressInfoSchema,
  })
  .strict();

export type PatientShieldOverview = z.infer<typeof patientShieldOverviewSchema>;

export interface RequesterContext {
  userId: string;
  role: "super_admin" | "medico" | "admin_clinica" | "paciente" | "system";
  patientId?: string;
  clinicId?: string;
}
