import {
  DEFAULT_JOURNEY_WEIGHTS,
  type JourneyGoalKind,
  type JourneyScoreGoal,
  type JourneyScoreEvent,
  type JourneyScoreResult,
  type JourneyScoreBreakdown,
  journeyScoreResultSchema,
} from "@/features/journey/contracts";

export interface JourneyEntitlements {
  hasSmartband?: boolean;
  hasBioimpedanceScale?: boolean;
}

export interface JourneyScoreEngineOptions {
  customWeights?: Partial<Record<JourneyGoalKind, number>>;
  timeZone?: string;
  evaluatedAt?: string;
}

export interface JourneyScoreCalculationInput {
  clinicId: string;
  patientId: string;
  evaluatedDate: string; // Formato "YYYY-MM-DD"
  goals: JourneyScoreGoal[];
  events: JourneyScoreEvent[];
  entitlements?: JourneyEntitlements;
  options?: JourneyScoreEngineOptions;
}

/**
 * Converte timestamp ISO para string de data "YYYY-MM-DD" no fuso informado ou UTC.
 */
function extractLocalDate(isoDateTime: string, timeZone?: string): string {
  try {
    const date = new Date(isoDateTime);
    if (isNaN(date.getTime())) {
      return isoDateTime.slice(0, 10);
    }
    if (timeZone) {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return formatter.format(date);
    }
    return date.toISOString().slice(0, 10);
  } catch {
    return isoDateTime.slice(0, 10);
  }
}

/**
 * Obtém o dia da semana (0 = Domingo, 1 = Segunda, ..., 6 = Sábado) para a data YYYY-MM-DD.
 */
function getDayOfWeek(dateStr: string): number {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return date.getUTCDay();
}

/**
 * Motor Determinístico da JORNADA (PRD v0.11.3 §11.4).
 * Calcula a pontuação diária normalizada de 0 a 100 pontos estritamente baseada
 * nas metas elegíveis e aplicáveis ao cliente na data indicada.
 */
export function calculateDailyJourneyScore(
  input: JourneyScoreCalculationInput,
): JourneyScoreResult {
  const {
    clinicId,
    patientId,
    evaluatedDate,
    goals,
    events,
    entitlements = {},
    options = {},
  } = input;
  const timeZone = options.timeZone || "UTC";
  const evaluatedAt = options.evaluatedAt || new Date().toISOString();
  const dayOfWeek = getDayOfWeek(evaluatedDate);

  // 1. Filtragem e de-duplicação de eventos pertinentes por sourceEventId
  const processedEventIds = new Set<string>();
  const validEventsForPatient: JourneyScoreEvent[] = [];

  for (const event of events) {
    // Garantia estrita de isolamento: eventos de outra clínica ou outro paciente são descartados
    if (event.clinicId !== clinicId || event.patientId !== patientId) {
      continue;
    }

    // Tratamento de idempotência: eventos duplicados são descartados
    if (processedEventIds.has(event.sourceEventId)) {
      continue;
    }
    processedEventIds.add(event.sourceEventId);

    // Verifica se a data de ocorrência corresponde à data avaliada
    const eventLocalDate = extractLocalDate(event.occurredAt, timeZone);
    if (eventLocalDate === evaluatedDate) {
      validEventsForPatient.push(event);
    }
  }

  // 2. Avaliação de cada meta individual
  let totalEligibleWeight = 0;
  let achievedWeight = 0;
  const breakdown: JourneyScoreBreakdown[] = [];

  for (const goal of goals) {
    // Isolamento multi-tenant: meta de outra clínica ou paciente é rejeitada
    if (goal.clinicId !== clinicId || goal.patientId !== patientId) {
      breakdown.push({
        goalId: goal.id,
        kind: goal.kind,
        status: "rejected_cross_tenant",
        weight: 0,
        isFulfilled: false,
        completionRatio: 0,
        contributedWeight: 0,
        evidenceCount: 0,
        sources: [],
        reason: "Meta descartada por pertencer a outra clínica ou paciente",
      });
      continue;
    }

    // Determina o peso configurado ou o peso padrão auditável
    const assignedWeight =
      options.customWeights?.[goal.kind] ?? goal.weight ?? DEFAULT_JOURNEY_WEIGHTS[goal.kind] ?? 10;

    // A. Meta suspensa por médico (PRD §11.6 - Pausa protegida)
    if (goal.status === "paused") {
      breakdown.push({
        goalId: goal.id,
        kind: goal.kind,
        status: "paused",
        weight: 0,
        isFulfilled: false,
        completionRatio: 0,
        contributedWeight: 0,
        evidenceCount: 0,
        sources: [],
        reason: "Meta suspensa por orientação médica (retirada do denominador)",
      });
      continue;
    }

    // B. Meta não aplicável
    if (goal.status === "not_applicable") {
      breakdown.push({
        goalId: goal.id,
        kind: goal.kind,
        status: "not_applicable",
        weight: 0,
        isFulfilled: false,
        completionRatio: 0,
        contributedWeight: 0,
        evidenceCount: 0,
        sources: [],
        reason: "Meta marcada como não aplicável (fora do denominador)",
      });
      continue;
    }

    // C. Medicação sem prescrição médica (PRD §11.4: "ausência de prescrição elimina missão de medicação do denominador")
    if (goal.kind === "medication" && !goal.prescriptionId) {
      breakdown.push({
        goalId: goal.id,
        kind: goal.kind,
        status: "no_prescription",
        weight: 0,
        isFulfilled: false,
        completionRatio: 0,
        contributedWeight: 0,
        evidenceCount: 0,
        sources: [],
        reason: "Medicação sem prescrição médica ativa não pontua nem penaliza",
      });
      continue;
    }

    // D. Vigência temporal da meta
    const effectiveDateStr = extractLocalDate(goal.effectiveFrom, timeZone);
    if (evaluatedDate < effectiveDateStr) {
      breakdown.push({
        goalId: goal.id,
        kind: goal.kind,
        status: "not_yet_effective",
        weight: 0,
        isFulfilled: false,
        completionRatio: 0,
        contributedWeight: 0,
        evidenceCount: 0,
        sources: [],
        reason: "Meta ainda não vigente na data avaliada",
      });
      continue;
    }

    if (goal.expiresAt) {
      const expiresDateStr = extractLocalDate(goal.expiresAt, timeZone);
      if (evaluatedDate >= expiresDateStr) {
        breakdown.push({
          goalId: goal.id,
          kind: goal.kind,
          status: "expired",
          weight: 0,
          isFulfilled: false,
          completionRatio: 0,
          contributedWeight: 0,
          evidenceCount: 0,
          sources: [],
          reason: "Meta expirada na data avaliada",
        });
        continue;
      }
    }

    // E. Dias de descanso em metas com dias ativos específicos (PRD §11.4: "exercício 3x/semana não gera falta nos dias de descanso")
    if (goal.activeDaysOfWeek && goal.activeDaysOfWeek.length > 0) {
      if (!goal.activeDaysOfWeek.includes(dayOfWeek)) {
        breakdown.push({
          goalId: goal.id,
          kind: goal.kind,
          status: "rest_day",
          weight: 0,
          isFulfilled: false,
          completionRatio: 0,
          contributedWeight: 0,
          evidenceCount: 0,
          sources: [],
          reason: "Dia de descanso programado (retirado do denominador)",
        });
        continue;
      }
    }

    // Meta é elegível para o dia!
    const goalEvents = validEventsForPatient.filter((e) => e.goalId === goal.id);
    const evidenceCount = goalEvents.length;
    const sources = Array.from(new Set(goalEvents.map((e) => e.source)));

    let completionRatio = 0;

    if (evidenceCount > 0) {
      if (goal.targetValue && goal.targetValue > 0) {
        // Meta com progresso cumulativo proporcional (ex: 2000 ml de água)
        const totalQuantity = goalEvents.reduce(
          (acc, e) => acc + (e.quantity && e.quantity > 0 ? e.quantity : 1),
          0,
        );
        completionRatio = Math.min(1.0, totalQuantity / goal.targetValue);
      } else {
        // Meta binária: qualquer evidência válida do dia cumpre a meta
        completionRatio = 1.0;
      }
    }

    const isFulfilled = completionRatio >= 1.0;
    const contributed = assignedWeight * completionRatio;

    totalEligibleWeight += assignedWeight;
    achievedWeight += contributed;

    breakdown.push({
      goalId: goal.id,
      kind: goal.kind,
      status: "eligible",
      weight: assignedWeight,
      isFulfilled,
      completionRatio,
      contributedWeight: Math.round(contributed * 100) / 100,
      evidenceCount,
      sources,
      reason: isFulfilled
        ? "Meta integralmente cumprida"
        : evidenceCount > 0
          ? `Meta parcialmente cumprida (${Math.round(completionRatio * 100)}%)`
          : "Nenhum registro para esta meta no dia avaliado",
    });
  }

  // 3. Verificação de dia não avaliável (PRD §11.4)
  if (totalEligibleWeight === 0) {
    const notEvaluableResult: JourneyScoreResult = {
      clinicId,
      patientId,
      evaluatedDate,
      status: "not_evaluable",
      score: null,
      totalEligibleWeight: 0,
      achievedWeight: 0,
      breakdown,
      rulesVersion: "v0.11.3",
      evaluatedAt,
      summary: "Dia não avaliável: nenhuma meta elegível ativa para a data informada",
    };
    return journeyScoreResultSchema.parse(notEvaluableResult);
  }

  // 4. Normalização da pontuação diária de 0 a 100
  const normalizedRaw = (achievedWeight / totalEligibleWeight) * 100;
  const score = Math.min(100, Math.max(0, Math.round(normalizedRaw)));

  const evaluatedResult: JourneyScoreResult = {
    clinicId,
    patientId,
    evaluatedDate,
    status: "evaluated",
    score,
    totalEligibleWeight,
    achievedWeight: Math.round(achievedWeight * 100) / 100,
    breakdown,
    rulesVersion: "v0.11.3",
    evaluatedAt,
    summary: `Pontuação diária calculada: ${score}/100 com base em ${breakdown.filter((b) => b.status === "eligible").length} meta(s) elegível(is).`,
  };

  return journeyScoreResultSchema.parse(evaluatedResult);
}
