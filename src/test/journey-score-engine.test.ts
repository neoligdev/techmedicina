import { describe, expect, it } from "vitest";
import {
  calculateDailyJourneyScore,
  type JourneyScoreCalculationInput,
} from "../lib/journey/score-engine";
import type { JourneyScoreGoal, JourneyScoreEvent } from "../features/journey/contracts";

const clinicA = "10000000-0000-4000-8000-000000000001";
const clinicB = "10000000-0000-4000-8000-000000000002";
const patientA = "20000000-0000-4000-8000-000000000001";
const patientB = "20000000-0000-4000-8000-000000000002";

const goalWaterId = "30000000-0000-4000-8000-000000000001";
const goalSleepId = "30000000-0000-4000-8000-000000000002";
const goalActivityId = "30000000-0000-4000-8000-000000000003";
const goalMedicationId = "30000000-0000-4000-8000-000000000004";
const goalEmotionId = "30000000-0000-4000-8000-000000000005";
const goalNutritionId = "30000000-0000-4000-8000-000000000006";

const evaluatedDate = "2026-10-14"; // Quarta-feira (dayOfWeek = 3)

function createGoal(
  partial: Partial<JourneyScoreGoal> & { id: string; kind: JourneyScoreGoal["kind"] },
): JourneyScoreGoal {
  return {
    id: partial.id,
    clinicId: partial.clinicId ?? clinicA,
    patientId: partial.patientId ?? patientA,
    version: 1,
    kind: partial.kind,
    cadence: partial.cadence ?? "daily",
    status: partial.status ?? "eligible",
    prescriptionId:
      partial.prescriptionId !== undefined
        ? partial.prescriptionId
        : partial.kind === "medication"
          ? "40000000-0000-4000-8000-000000000001"
          : null,
    effectiveFrom: partial.effectiveFrom ?? "2026-10-01T00:00:00Z",
    expiresAt: partial.expiresAt ?? null,
    weight: partial.weight,
    targetValue: partial.targetValue,
    activeDaysOfWeek: partial.activeDaysOfWeek,
  };
}

function createEvent(
  partial: Partial<JourneyScoreEvent> & { goalId: string; sourceEventId: string },
): JourneyScoreEvent {
  return {
    clinicId: partial.clinicId ?? clinicA,
    patientId: partial.patientId ?? patientA,
    goalId: partial.goalId,
    goalVersion: 1,
    sourceEventId: partial.sourceEventId,
    source: partial.source ?? "self_report",
    occurredAt: partial.occurredAt ?? `${evaluatedDate}T10:00:00Z`,
    receivedAt: partial.receivedAt ?? `${evaluatedDate}T10:01:00Z`,
    quantity: partial.quantity,
  };
}

describe("Motor Determinístico da JORNADA (VJE-3)", () => {
  it("cliente com plano apenas manual atinge 100 pontos sem penalização por falta de equipamento", () => {
    // 3 metas manuais: hidratação (10), alimentação (10), check-in emocional (10) -> total 30
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
      createGoal({ id: goalNutritionId, kind: "nutrition", weight: 10 }),
      createGoal({ id: goalEmotionId, kind: "emotion", weight: 10 }),
    ];

    const events: JourneyScoreEvent[] = [
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-1", source: "self_report" }),
      createEvent({ goalId: goalNutritionId, sourceEventId: "ev-2", source: "self_report" }),
      createEvent({ goalId: goalEmotionId, sourceEventId: "ev-3", source: "self_report" }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events,
      entitlements: { hasSmartband: false, hasBioimpedanceScale: false },
    });

    expect(result.status).toBe("evaluated");
    expect(result.score).toBe(100);
    expect(result.totalEligibleWeight).toBe(30);
    expect(result.achievedWeight).toBe(30);
    expect(result.breakdown.every((b) => b.isFulfilled)).toBe(true);
  });

  it("posse de pulseira inteligente não concede bônus automático e apenas comprova metas de atividade", () => {
    // Cliente com pulseira contratada, mas sem registros no dia
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
      createGoal({ id: goalActivityId, kind: "activity", weight: 20 }),
    ];

    // Nenhuma atividade realizada
    const resultSemEventos = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events: [],
      entitlements: { hasSmartband: true },
    });

    // Posse da pulseira não pontua por si só: score = 0
    expect(resultSemEventos.status).toBe("evaluated");
    expect(resultSemEventos.score).toBe(0);
    expect(resultSemEventos.totalEligibleWeight).toBe(30);
    expect(resultSemEventos.achievedWeight).toBe(0);

    // Quando a pulseira sincroniza telemetria de atividade
    const eventsPulseira: JourneyScoreEvent[] = [
      createEvent({
        goalId: goalActivityId,
        sourceEventId: "ev-pulseira-1",
        source: "device_smartband",
      }),
    ];

    const resultComTelemetria = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events: eventsPulseira,
      entitlements: { hasSmartband: true },
    });

    // 20 de 30 pontos = 67%
    expect(resultComTelemetria.status).toBe("evaluated");
    expect(resultComTelemetria.score).toBe(67);
    expect(resultComTelemetria.achievedWeight).toBe(20);
    expect(
      resultComTelemetria.breakdown.find((b) => b.goalId === goalActivityId)?.sources,
    ).toContain("device_smartband");
  });

  it("cliente com balança de bioimpedância não recebe bônus automático e atinge pontuação por comprovação", () => {
    const goalScaleId = "30000000-0000-4000-8000-000000000007";
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
      createGoal({ id: goalScaleId, kind: "protocol", weight: 15 }),
    ];

    // Sem pesagem no dia
    const semPesagem = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events: [createEvent({ goalId: goalWaterId, sourceEventId: "ev-w", source: "self_report" })],
      entitlements: { hasBioimpedanceScale: true },
    });

    // 10 de 25 = 40%
    expect(semPesagem.score).toBe(40);

    // Com pesagem da balança
    const comPesagem = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events: [
        createEvent({ goalId: goalWaterId, sourceEventId: "ev-w", source: "self_report" }),
        createEvent({ goalId: goalScaleId, sourceEventId: "ev-scale-1", source: "device_scale" }),
      ],
      entitlements: { hasBioimpedanceScale: true },
    });

    expect(comPesagem.score).toBe(100);
    expect(comPesagem.achievedWeight).toBe(25);
  });

  it("coexistência de pulseira e autorrelato manual para a mesma meta não duplica pontos (anti-duplicação)", () => {
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalActivityId, kind: "activity", weight: 20 }),
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
    ];

    // O usuário registrou atividade manual E a pulseira enviou leitura de atividade
    const events: JourneyScoreEvent[] = [
      createEvent({
        goalId: goalActivityId,
        sourceEventId: "ev-act-manual",
        source: "self_report",
      }),
      createEvent({
        goalId: goalActivityId,
        sourceEventId: "ev-act-band",
        source: "device_smartband",
      }),
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-water", source: "self_report" }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events,
      entitlements: { hasSmartband: true },
    });

    // Meta de atividade deve receber no máximo seus 20 pontos de peso, não 40!
    expect(result.score).toBe(100);
    expect(result.totalEligibleWeight).toBe(30);
    expect(result.achievedWeight).toBe(30);

    const actBreakdown = result.breakdown.find((b) => b.goalId === goalActivityId);
    expect(actBreakdown?.contributedWeight).toBe(20);
    expect(actBreakdown?.evidenceCount).toBe(2);
    expect(actBreakdown?.sources).toEqual(
      expect.arrayContaining(["self_report", "device_smartband"]),
    );
  });

  it("meta médica suspensa (status: paused) é retirada do denominador sem penalizar o paciente", () => {
    // 3 metas cadastradas, mas atividade está pausada por recomendação médica
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
      createGoal({ id: goalSleepId, kind: "sleep", weight: 15 }),
      createGoal({ id: goalActivityId, kind: "activity", status: "paused", weight: 20 }), // PAUSADA
    ];

    // Paciente cumpre água e sono
    const events: JourneyScoreEvent[] = [
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-w", source: "self_report" }),
      createEvent({ goalId: goalSleepId, sourceEventId: "ev-s", source: "self_report" }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events,
    });

    // O denominador é 10 + 15 = 25 (a meta de 20 não entra!). Paciente atinge 100% (25/25)
    expect(result.score).toBe(100);
    expect(result.totalEligibleWeight).toBe(25);
    expect(result.achievedWeight).toBe(25);

    const pausedGoal = result.breakdown.find((b) => b.goalId === goalActivityId);
    expect(pausedGoal?.status).toBe("paused");
    expect(pausedGoal?.weight).toBe(0);
  });

  it("meta sem dados no dia conta no denominador e não pontua", () => {
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
      createGoal({ id: goalSleepId, kind: "sleep", weight: 10 }),
    ];

    // Apenas água foi registrada
    const events: JourneyScoreEvent[] = [
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-w", source: "self_report" }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events,
    });

    // 10 de 20 = 50%
    expect(result.score).toBe(50);
    expect(result.totalEligibleWeight).toBe(20);
    expect(result.achievedWeight).toBe(10);

    const sleepGoal = result.breakdown.find((b) => b.goalId === goalSleepId);
    expect(sleepGoal?.isFulfilled).toBe(false);
    expect(sleepGoal?.contributedWeight).toBe(0);
    expect(sleepGoal?.evidenceCount).toBe(0);
  });

  it("registros duplicados (mesmo sourceEventId) são de-duplicados sem pontuar duas vezes", () => {
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
    ];

    // Evento idêntico duplicado (ex: retry de rede)
    const events: JourneyScoreEvent[] = [
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-dup-1" }),
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-dup-1" }),
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-dup-1" }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events,
    });

    expect(result.score).toBe(100);
    expect(result.achievedWeight).toBe(10);
    expect(result.breakdown[0]?.evidenceCount).toBe(1);
  });

  it("registros enviados fora de ordem ou com atraso são associados à data de ocorrência correta", () => {
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
      createGoal({ id: goalSleepId, kind: "sleep", weight: 15 }),
    ];

    // Evento do sono recebido com atraso dias depois, mas ocorrido em 2026-10-14
    const events: JourneyScoreEvent[] = [
      createEvent({
        goalId: goalSleepId,
        sourceEventId: "ev-sleep-late",
        occurredAt: "2026-10-14T07:00:00Z",
        receivedAt: "2026-10-16T12:00:00Z", // Recebido 2 dias depois!
      }),
      createEvent({
        goalId: goalWaterId,
        sourceEventId: "ev-water-ontime",
        occurredAt: "2026-10-14T15:00:00Z",
        receivedAt: "2026-10-14T15:01:00Z",
      }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate: "2026-10-14",
      goals,
      events,
    });

    expect(result.score).toBe(100);
    expect(result.achievedWeight).toBe(25);
  });

  it("eventos de outra data não pontuam no dia avaliado", () => {
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
    ];

    // Ocorrido ontem
    const events: JourneyScoreEvent[] = [
      createEvent({
        goalId: goalWaterId,
        sourceEventId: "ev-yesterday",
        occurredAt: "2026-10-13T20:00:00Z",
      }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate: "2026-10-14",
      goals,
      events,
    });

    expect(result.score).toBe(0);
    expect(result.achievedWeight).toBe(0);
  });

  it("garante isolamento multiempresa e rejeita metas e eventos de outra clínica ou paciente", () => {
    const goals: JourneyScoreGoal[] = [
      createGoal({
        id: goalWaterId,
        clinicId: clinicA,
        patientId: patientA,
        kind: "hydration",
        weight: 10,
      }),
      createGoal({
        id: goalSleepId,
        clinicId: clinicB,
        patientId: patientA,
        kind: "sleep",
        weight: 15,
      }), // OUTRA CLÍNICA
      createGoal({
        id: goalActivityId,
        clinicId: clinicA,
        patientId: patientB,
        kind: "activity",
        weight: 20,
      }), // OUTRO PACIENTE
    ];

    const events: JourneyScoreEvent[] = [
      createEvent({
        goalId: goalWaterId,
        clinicId: clinicA,
        patientId: patientA,
        sourceEventId: "ev-valid",
      }),
      createEvent({
        goalId: goalSleepId,
        clinicId: clinicB,
        patientId: patientA,
        sourceEventId: "ev-cross-clinic",
      }),
      createEvent({
        goalId: goalActivityId,
        clinicId: clinicA,
        patientId: patientB,
        sourceEventId: "ev-cross-patient",
      }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events,
    });

    // Apenas a meta da clínica A e paciente A é elegível (peso 10)
    expect(result.totalEligibleWeight).toBe(10);
    expect(result.achievedWeight).toBe(10);
    expect(result.score).toBe(100);

    // Metas de outros tenants/pacientes aparecem como rejeitadas
    const rejected = result.breakdown.filter((b) => b.status === "rejected_cross_tenant");
    expect(rejected).toHaveLength(2);
  });

  it("retorna 'not_evaluable' com score null se não houver metas elegíveis (PRD §11.4)", () => {
    // Paciente com todas as metas pausadas pelo médico
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", status: "paused" }),
      createGoal({ id: goalSleepId, kind: "sleep", status: "paused" }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events: [],
    });

    expect(result.status).toBe("not_evaluable");
    expect(result.score).toBeNull();
    expect(result.totalEligibleWeight).toBe(0);
    expect(result.achievedWeight).toBe(0);
    expect(result.summary).toContain("Dia não avaliável");
  });

  it("medicação sem prescrição médica não penaliza e sai do denominador", () => {
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
      createGoal({ id: goalMedicationId, kind: "medication", prescriptionId: null, weight: 20 }),
    ];

    const events: JourneyScoreEvent[] = [
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-w" }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events,
    });

    // Total elegível é apenas 10. Paciente atinge 100%
    expect(result.totalEligibleWeight).toBe(10);
    expect(result.score).toBe(100);
    const medBreakdown = result.breakdown.find((b) => b.goalId === goalMedicationId);
    expect(medBreakdown?.status).toBe("no_prescription");
  });

  it("dia de descanso semanal não gera falta e é retirado do denominador", () => {
    // evaluatedDate é Quarta-feira (dayOfWeek = 3)
    // Meta de atividade configurada para Segunda (1), Sexta (5) e Sábado (6)
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
      createGoal({
        id: goalActivityId,
        kind: "activity",
        cadence: "weekly",
        activeDaysOfWeek: [1, 5, 6], // Quarta-feira (3) NÃO está na lista
        weight: 20,
      }),
    ];

    const events: JourneyScoreEvent[] = [
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-w" }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events,
    });

    // Na quarta-feira, atividade é dia de descanso. Total elegível = 10, score = 100%
    expect(result.totalEligibleWeight).toBe(10);
    expect(result.score).toBe(100);

    const actGoal = result.breakdown.find((b) => b.goalId === goalActivityId);
    expect(actGoal?.status).toBe("rest_day");
  });

  it("cálculo é 100% determinístico e idempotente em múltiplas execuções", () => {
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10 }),
      createGoal({ id: goalSleepId, kind: "sleep", weight: 15 }),
      createGoal({ id: goalActivityId, kind: "activity", weight: 20 }),
    ];

    const events: JourneyScoreEvent[] = [
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-1" }),
      createEvent({ goalId: goalActivityId, sourceEventId: "ev-2" }),
    ];

    const input: JourneyScoreCalculationInput = {
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events,
      options: { evaluatedAt: "2026-10-14T12:00:00Z" },
    };

    const res1 = calculateDailyJourneyScore(input);
    const res2 = calculateDailyJourneyScore(input);
    const res3 = calculateDailyJourneyScore(input);

    expect(res1).toEqual(res2);
    expect(res2).toEqual(res3);
    // 10 + 20 de 45 = 67%
    expect(res1.score).toBe(67);
  });

  it("limites estritos: pontuação nunca excede 100 nem fica abaixo de 0", () => {
    const goals: JourneyScoreGoal[] = [
      createGoal({ id: goalWaterId, kind: "hydration", weight: 10, targetValue: 2000 }),
    ];

    // Usuário bebeu 5000 ml (mais do que a meta)
    const events: JourneyScoreEvent[] = [
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-w1", quantity: 3000 }),
      createEvent({ goalId: goalWaterId, sourceEventId: "ev-w2", quantity: 2000 }),
    ];

    const result = calculateDailyJourneyScore({
      clinicId: clinicA,
      patientId: patientA,
      evaluatedDate,
      goals,
      events,
    });

    expect(result.score).toBe(100);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
