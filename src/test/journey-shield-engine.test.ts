import { describe, expect, it } from "vitest";
import {
  calculatePatientShield,
  getShieldByScore,
  calculate7DayScoreAverage,
  generateDeterministicShieldUUID,
} from "../lib/journey/shield-engine";
import {
  SHIELD_TIERS,
  type JourneyScoreResult,
  type PatientShieldState,
  type ShieldHistoryEvent,
} from "../features/journey/contracts";

const clinicA = "10000000-0000-4000-8000-000000000001";
const clinicB = "10000000-0000-4000-8000-000000000002";
const patientA = "20000000-0000-4000-8000-000000000001";
const patientB = "20000000-0000-4000-8000-000000000002";

function createScoreResult(partial: {
  clinicId?: string;
  patientId?: string;
  evaluatedDate: string;
  score: number | null;
  status?: "evaluated" | "not_evaluable";
  evaluatedAt?: string;
}): JourneyScoreResult {
  return {
    clinicId: partial.clinicId ?? clinicA,
    patientId: partial.patientId ?? patientA,
    evaluatedDate: partial.evaluatedDate,
    status: partial.status ?? (partial.score !== null ? "evaluated" : "not_evaluable"),
    score: partial.score,
    totalEligibleWeight: 100,
    achievedWeight: partial.score ?? 0,
    breakdown: [],
    rulesVersion: "v0.11.3",
    evaluatedAt: partial.evaluatedAt ?? `${partial.evaluatedDate}T23:59:00Z`,
    summary: `Score diário: ${partial.score ?? "N/A"}`,
  };
}

describe("Motor Determinístico de Escudos (PRD v0.11.3 §11.5)", () => {
  // 1. Cada um dos cinco Escudos
  it("1. reconhece e classifica cada um dos cinco Escudos canônicos", () => {
    expect(getShieldByScore(15)).toBe("origem");
    expect(getShieldByScore(40)).toBe("ritmo");
    expect(getShieldByScore(65)).toBe("avanco");
    expect(getShieldByScore(80)).toBe("equilibrio");
    expect(getShieldByScore(95)).toBe("plenitude");

    expect(SHIELD_TIERS.origem.name).toBe("Origem");
    expect(SHIELD_TIERS.ritmo.name).toBe("Ritmo");
    expect(SHIELD_TIERS.avanco.name).toBe("Avanço");
    expect(SHIELD_TIERS.equilibrio.name).toBe("Equilíbrio");
    expect(SHIELD_TIERS.plenitude.name).toBe("Plenitude");
  });

  // 2. Limites inferiores e superiores exatos de cada Escudo
  it("2. valida os limites inferiores e superiores exatos de cada Escudo", () => {
    // Origem: 0 a 29
    expect(getShieldByScore(0)).toBe("origem");
    expect(getShieldByScore(29)).toBe("origem");

    // Ritmo: 30 a 54
    expect(getShieldByScore(30)).toBe("ritmo");
    expect(getShieldByScore(54)).toBe("ritmo");

    // Avanço: 55 a 74
    expect(getShieldByScore(55)).toBe("avanco");
    expect(getShieldByScore(74)).toBe("avanco");

    // Equilíbrio: 75 a 89
    expect(getShieldByScore(75)).toBe("equilibrio");
    expect(getShieldByScore(89)).toBe("equilibrio");

    // Plenitude: 90 a 100
    expect(getShieldByScore(90)).toBe("plenitude");
    expect(getShieldByScore(100)).toBe("plenitude");
  });

  // 3. Promoção entre Escudos
  it("3. promove o cliente imediatamente ao alcançar a média necessária", () => {
    const initialState: PatientShieldState = {
      clinicId: clinicA,
      patientId: patientA,
      activeShield: "origem",
      highestShieldEarned: "origem",
      isProvisional: false,
      scoreAverage: 20,
      scoreAverageRounded: 20,
      evaluableDaysCount: 7,
      consecutiveLowDays: 0,
      lastEvaluatedDate: "2026-10-07",
      evaluatedAt: "2026-10-07T23:59:00Z",
      rulesVersion: "v0.11.3",
      recentAction: "initial",
      reason: "Estado inicial",
    };

    // Nova sequência de 7 dias com média 60 (Avanço)
    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-08", score: 60 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 60 }),
      createScoreResult({ evaluatedDate: "2026-10-10", score: 60 }),
      createScoreResult({ evaluatedDate: "2026-10-11", score: 60 }),
      createScoreResult({ evaluatedDate: "2026-10-12", score: 60 }),
      createScoreResult({ evaluatedDate: "2026-10-13", score: 60 }),
      createScoreResult({ evaluatedDate: "2026-10-14", score: 60 }),
    ];

    const result = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evs,
      currentState: initialState,
    });

    expect(result.state.activeShield).toBe("avanco");
    expect(result.state.highestShieldEarned).toBe("avanco");
    expect(result.state.recentAction).toBe("promotion");
    expect(result.state.consecutiveLowDays).toBe(0);
    expect(result.historyEvent).not.toBeNull();
    expect(result.historyEvent?.action).toBe("promotion");
    expect(result.historyEvent?.shield).toBe("avanco");
    expect(result.historyEvent?.previousShield).toBe("origem");
  });

  // 4. Manutenção de Escudo
  it("4. mantém o escudo ativo enquanto a média permanecer na mesma faixa", () => {
    const currentState: PatientShieldState = {
      clinicId: clinicA,
      patientId: patientA,
      activeShield: "ritmo",
      highestShieldEarned: "ritmo",
      isProvisional: false,
      scoreAverage: 45,
      scoreAverageRounded: 45,
      evaluableDaysCount: 7,
      consecutiveLowDays: 0,
      lastEvaluatedDate: "2026-10-07",
      evaluatedAt: "2026-10-07T23:59:00Z",
      rulesVersion: "v0.11.3",
      recentAction: "promotion",
      reason: "Ritmo conquistado",
    };

    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-08", score: 40 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 45 }),
      createScoreResult({ evaluatedDate: "2026-10-10", score: 50 }),
      createScoreResult({ evaluatedDate: "2026-10-11", score: 40 }),
      createScoreResult({ evaluatedDate: "2026-10-12", score: 42 }),
      createScoreResult({ evaluatedDate: "2026-10-13", score: 48 }),
      createScoreResult({ evaluatedDate: "2026-10-14", score: 45 }),
    ];

    const result = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evs,
      currentState,
    });

    expect(result.state.activeShield).toBe("ritmo");
    expect(result.state.highestShieldEarned).toBe("ritmo");
    expect(result.state.recentAction).toBe("maintenance");
    expect(result.state.consecutiveLowDays).toBe(0);
    expect(result.historyEvent).toBeNull(); // Não polui histórico em manutenção contínua
  });

  // 5. Regressão controlada após 3 avaliações consecutivas desfavoráveis
  it("5. regride de escudo somente após 3 avaliações consecutivas desfavoráveis", () => {
    // Cliente com Escudo Equilíbrio (75-89)
    let state: PatientShieldState = {
      clinicId: clinicA,
      patientId: patientA,
      activeShield: "equilibrio",
      highestShieldEarned: "equilibrio",
      isProvisional: false,
      scoreAverage: 80,
      scoreAverageRounded: 80,
      evaluableDaysCount: 7,
      consecutiveLowDays: 0,
      lastEvaluatedDate: "2026-10-07",
      evaluatedAt: "2026-10-07T23:59:00Z",
      rulesVersion: "v0.11.3",
      recentAction: "promotion",
      reason: "Equilíbrio",
    };

    // Avaliação 1 desfavorável (média cai para 50, que seria Ritmo)
    const evsDay1 = [
      createScoreResult({ evaluatedDate: "2026-10-02", score: 50 }),
      createScoreResult({ evaluatedDate: "2026-10-03", score: 50 }),
      createScoreResult({ evaluatedDate: "2026-10-04", score: 50 }),
      createScoreResult({ evaluatedDate: "2026-10-05", score: 50 }),
      createScoreResult({ evaluatedDate: "2026-10-06", score: 50 }),
      createScoreResult({ evaluatedDate: "2026-10-07", score: 50 }),
      createScoreResult({ evaluatedDate: "2026-10-08", score: 50 }),
    ];

    const res1 = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-08",
      evaluations: evsDay1,
      currentState: state,
    });

    expect(res1.state.activeShield).toBe("equilibrio"); // MANTIDO
    expect(res1.state.consecutiveLowDays).toBe(1);
    expect(res1.state.recentAction).toBe("maintenance");

    // Avaliação 2 desfavorável
    state = res1.state;
    const evsDay2 = [
      ...evsDay1.slice(1),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 50 }),
    ];

    const res2 = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-09",
      evaluations: evsDay2,
      currentState: state,
    });

    expect(res2.state.activeShield).toBe("equilibrio"); // MANTIDO AINDA
    expect(res2.state.consecutiveLowDays).toBe(2);
    expect(res2.state.recentAction).toBe("maintenance");

    // Avaliação 3 desfavorável -> REGRESSÃO CONFIRMADA!
    state = res2.state;
    const evsDay3 = [
      ...evsDay2.slice(1),
      createScoreResult({ evaluatedDate: "2026-10-10", score: 50 }),
    ];

    const res3 = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-10",
      evaluations: evsDay3,
      currentState: state,
    });

    expect(res3.state.activeShield).toBe("ritmo"); // REGREDIU
    expect(res3.state.highestShieldEarned).toBe("equilibrio"); // PRESERVADO
    expect(res3.state.consecutiveLowDays).toBe(0); // Resetado
    expect(res3.state.recentAction).toBe("regression");
    expect(res3.historyEvent?.action).toBe("regression");
    expect(res3.historyEvent?.shield).toBe("ritmo");
    expect(res3.historyEvent?.previousShield).toBe("equilibrio");
  });

  // 6. Uma, duas e três avaliações desfavoráveis e recuperação no 2º dia
  it("6. cancela a regressão se o cliente se recuperar no segundo ou terceiro dia", () => {
    const state: PatientShieldState = {
      clinicId: clinicA,
      patientId: patientA,
      activeShield: "plenitude",
      highestShieldEarned: "plenitude",
      isProvisional: false,
      scoreAverage: 95,
      scoreAverageRounded: 95,
      evaluableDaysCount: 7,
      consecutiveLowDays: 1, // Já tinha 1 dia desfavorável
      lastEvaluatedDate: "2026-10-08",
      evaluatedAt: "2026-10-08T23:59:00Z",
      rulesVersion: "v0.11.3",
      recentAction: "maintenance",
      reason: "Alerta 1/3",
    };

    // Novo dia onde a média móvel voltou para 92 (Plenitude)
    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-03", score: 92 }),
      createScoreResult({ evaluatedDate: "2026-10-04", score: 92 }),
      createScoreResult({ evaluatedDate: "2026-10-05", score: 92 }),
      createScoreResult({ evaluatedDate: "2026-10-06", score: 92 }),
      createScoreResult({ evaluatedDate: "2026-10-07", score: 92 }),
      createScoreResult({ evaluatedDate: "2026-10-08", score: 92 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 92 }),
    ];

    const result = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-09",
      evaluations: evs,
      currentState: state,
    });

    expect(result.state.activeShield).toBe("plenitude");
    expect(result.state.consecutiveLowDays).toBe(0); // ZERADO! Recuperou a estabilidade
    expect(result.state.recentAction).toBe("maintenance");
  });

  // 7. Dados fora de ordem
  it("7. processa corretamente avaliações fornecidas fora da ordem cronológica", () => {
    // Avaliações embaralhadas
    const shuffled = [
      createScoreResult({ evaluatedDate: "2026-10-14", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-08", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-12", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-11", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-13", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-10", score: 80 }),
    ];

    const result = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: shuffled,
    });

    expect(result.state.evaluableDaysCount).toBe(7);
    expect(result.state.scoreAverageRounded).toBe(80);
    expect(result.state.activeShield).toBe("equilibrio");
    // Garante que ordenou cronologicamente
    expect(result.consideredEvaluations[0]!.evaluatedDate).toBe("2026-10-08");
    expect(result.consideredEvaluations[6]!.evaluatedDate).toBe("2026-10-14");
  });

  // 8. Dias não avaliáveis
  it("8. nunca preenche dias não avaliáveis com zero e os exclui do divisor", () => {
    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-08", score: 100 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: null, status: "not_evaluable" }), // dia não avaliável
      createScoreResult({ evaluatedDate: "2026-10-10", score: 100 }),
      createScoreResult({ evaluatedDate: "2026-10-11", score: null, status: "not_evaluable" }), // dia não avaliável
      createScoreResult({ evaluatedDate: "2026-10-12", score: 100 }),
    ];

    const window = calculate7DayScoreAverage(evs, "2026-10-12", clinicA, patientA);

    expect(window.evaluableDaysCount).toBe(3);
    expect(window.nonEvaluableDaysCount).toBe(2);
    // Média de 100, 100, 100 = 100 (se preenchesse com zero, seria 300 / 5 = 60!)
    expect(window.scoreAverage).toBe(100);
    expect(window.scoreAverageRounded).toBe(100);
    expect(window.isProvisional).toBe(true); // < 7 dias
  });

  // 9. Histórico insuficiente
  it("9. lida com histórico insuficiente marcando estado provisório e atribuindo Origem sem dados", () => {
    // Caso 9a: Zero dias avaliáveis
    const resZero = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: [],
    });

    expect(resZero.state.activeShield).toBe("origem");
    expect(resZero.state.highestShieldEarned).toBe("origem");
    expect(resZero.state.scoreAverage).toBeNull();
    expect(resZero.state.isProvisional).toBe(true);
    expect(resZero.state.evaluableDaysCount).toBe(0);
    // Estado provisório sem dados NÃO gera evento no histórico permanente de conquistas
    expect(resZero.historyEvent).toBeNull();
    expect(resZero.fullHistory).toHaveLength(0);

    // Caso 9b: 3 dias avaliáveis com score 60
    const resPartial = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: [
        createScoreResult({ evaluatedDate: "2026-10-12", score: 60 }),
        createScoreResult({ evaluatedDate: "2026-10-13", score: 60 }),
        createScoreResult({ evaluatedDate: "2026-10-14", score: 60 }),
      ],
    });

    expect(resPartial.state.activeShield).toBe("avanco");
    expect(resPartial.state.scoreAverageRounded).toBe(60);
    expect(resPartial.state.isProvisional).toBe(true);
    expect(resPartial.state.evaluableDaysCount).toBe(3);
    // Com dados avaliados válidos, registra a primeira conquista comprovada
    expect(resPartial.historyEvent).not.toBeNull();
    expect(resPartial.fullHistory).toHaveLength(1);
  });

  // 10. Clientes sem dispositivos
  it("10. permite a clientes sem dispositivos pontuar e alcançar Plenitude por autorrelato", () => {
    // 7 dias consecutivos com pontuação 95 obtida exclusivamente via metas de app
    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-08", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-10", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-11", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-12", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-13", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-14", score: 95 }),
    ];

    const result = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evs,
    });

    expect(result.state.activeShield).toBe("plenitude");
    expect(result.state.highestShieldEarned).toBe("plenitude");
    expect(result.state.isProvisional).toBe(false);
    expect(result.state.recentAction).toBe("initial");
  });

  // 11. Clientes com dispositivos
  it("11. processa pontuações de clientes com dispositivos de monitoramento", () => {
    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-08", score: 85 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 88 }),
      createScoreResult({ evaluatedDate: "2026-10-10", score: 90 }),
      createScoreResult({ evaluatedDate: "2026-10-11", score: 82 }),
      createScoreResult({ evaluatedDate: "2026-10-12", score: 85 }),
      createScoreResult({ evaluatedDate: "2026-10-13", score: 86 }),
      createScoreResult({ evaluatedDate: "2026-10-14", score: 85 }),
    ];

    const result = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evs,
    });

    // Média = 85.86 -> 86 pts -> Equilíbrio
    expect(result.state.scoreAverageRounded).toBe(86);
    expect(result.state.activeShield).toBe("equilibrio");
  });

  // 12. Metas suspensas e pausas médicas
  it("12. respeita metas suspensas e pausas médicas sem causar regressão indevida", () => {
    const currentState: PatientShieldState = {
      clinicId: clinicA,
      patientId: patientA,
      activeShield: "avanco",
      highestShieldEarned: "avanco",
      isProvisional: false,
      scoreAverage: 65,
      scoreAverageRounded: 65,
      evaluableDaysCount: 7,
      consecutiveLowDays: 0,
      lastEvaluatedDate: "2026-10-07",
      evaluatedAt: "2026-10-07T23:59:00Z",
      rulesVersion: "v0.11.3",
      recentAction: "promotion",
      reason: "Avanço",
    };

    // Durante 4 dias o paciente esteve em pausa médica (not_evaluable)
    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-04", score: 65 }),
      createScoreResult({ evaluatedDate: "2026-10-05", score: 65 }),
      createScoreResult({ evaluatedDate: "2026-10-06", score: 65 }),
      createScoreResult({ evaluatedDate: "2026-10-07", score: null, status: "not_evaluable" }),
      createScoreResult({ evaluatedDate: "2026-10-08", score: null, status: "not_evaluable" }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: null, status: "not_evaluable" }),
      createScoreResult({ evaluatedDate: "2026-10-10", score: null, status: "not_evaluable" }),
    ];

    const result = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-10",
      evaluations: evs,
      currentState,
    });

    // Escudo é mantido, os dias não avaliáveis não baixam a média e não incrementam consecutiveLowDays
    expect(result.state.activeShield).toBe("avanco");
    expect(result.state.consecutiveLowDays).toBe(0);
    expect(result.state.scoreAverageRounded).toBe(65);
    expect(result.state.evaluableDaysCount).toBe(3);
  });

  // 13. Conquistas históricas preservadas
  it("13. preserva permanentemente o maior escudo histórico conquistado mesmo após regressão", () => {
    const stateBeforeRegression: PatientShieldState = {
      clinicId: clinicA,
      patientId: patientA,
      activeShield: "plenitude",
      highestShieldEarned: "plenitude",
      isProvisional: false,
      scoreAverage: 92,
      scoreAverageRounded: 92,
      evaluableDaysCount: 7,
      consecutiveLowDays: 2, // 2 dias desfavoráveis
      lastEvaluatedDate: "2026-10-09",
      evaluatedAt: "2026-10-09T23:59:00Z",
      rulesVersion: "v0.11.3",
      recentAction: "maintenance",
      reason: "Alerta 2/3",
    };

    // 3ª avaliação consecutiva desfavorável com média 20 (Origem)
    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-04", score: 20 }),
      createScoreResult({ evaluatedDate: "2026-10-05", score: 20 }),
      createScoreResult({ evaluatedDate: "2026-10-06", score: 20 }),
      createScoreResult({ evaluatedDate: "2026-10-07", score: 20 }),
      createScoreResult({ evaluatedDate: "2026-10-08", score: 20 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 20 }),
      createScoreResult({ evaluatedDate: "2026-10-10", score: 20 }),
    ];

    const result = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-10",
      evaluations: evs,
      currentState: stateBeforeRegression,
    });

    expect(result.state.activeShield).toBe("origem"); // Ativo regrediu para Origem
    expect(result.state.highestShieldEarned).toBe("plenitude"); // Maior conquistado permanece PLENITUDE!
    expect(result.state.recentAction).toBe("regression");
  });

  // 14. Processamentos repetidos / Idempotência
  it("14. garante idempotência e não duplica eventos de histórico em reprocessamento", () => {
    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-08", score: 70 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 70 }),
      createScoreResult({ evaluatedDate: "2026-10-10", score: 70 }),
      createScoreResult({ evaluatedDate: "2026-10-11", score: 70 }),
      createScoreResult({ evaluatedDate: "2026-10-12", score: 70 }),
      createScoreResult({ evaluatedDate: "2026-10-13", score: 70 }),
      createScoreResult({ evaluatedDate: "2026-10-14", score: 70 }),
    ];

    // Primeira execução
    const firstRun = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evs,
      existingHistory: [],
    });

    expect(firstRun.fullHistory).toHaveLength(1);
    const createdEventId = firstRun.fullHistory[0]!.id;

    // Segunda execução com o mesmo input e o histórico anterior
    const secondRun = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evs,
      existingHistory: firstRun.fullHistory,
    });

    // Não deve duplicar o evento no histórico!
    expect(secondRun.fullHistory).toHaveLength(1);
    expect(secondRun.fullHistory[0]!.id).toBe(createdEventId);
  });

  // 15. Separação de dados entre clínicas
  it("15. isola rigorosamente os dados e rejeita contaminação entre diferentes clínicas e pacientes", () => {
    const mixedEvs = [
      createScoreResult({
        clinicId: clinicA,
        patientId: patientA,
        evaluatedDate: "2026-10-08",
        score: 80,
      }),
      createScoreResult({
        clinicId: clinicB,
        patientId: patientA,
        evaluatedDate: "2026-10-09",
        score: 0,
      }), // Outra clínica!
      createScoreResult({
        clinicId: clinicA,
        patientId: patientB,
        evaluatedDate: "2026-10-10",
        score: 10,
      }), // Outro paciente!
      createScoreResult({
        clinicId: clinicA,
        patientId: patientA,
        evaluatedDate: "2026-10-11",
        score: 80,
      }),
      createScoreResult({
        clinicId: clinicA,
        patientId: patientA,
        evaluatedDate: "2026-10-12",
        score: 80,
      }),
      createScoreResult({
        clinicId: clinicA,
        patientId: patientA,
        evaluatedDate: "2026-10-13",
        score: 80,
      }),
      createScoreResult({
        clinicId: clinicA,
        patientId: patientA,
        evaluatedDate: "2026-10-14",
        score: 80,
      }),
    ];

    const result = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: mixedEvs,
    });

    // Apenas os 5 dias legítimos do patientA na clinicA devem ser considerados
    expect(result.state.evaluableDaysCount).toBe(5);
    expect(result.state.scoreAverageRounded).toBe(80);
    expect(result.state.activeShield).toBe("equilibrio");
    expect(
      result.consideredEvaluations.every((e) => e.clinicId === clinicA && e.patientId === patientA),
    ).toBe(true);
  });

  // 16. Ausência de regressão indevida
  it("16. não causa regressão indevida por um único dia ruim ou oscilação temporária", () => {
    const currentState: PatientShieldState = {
      clinicId: clinicA,
      patientId: patientA,
      activeShield: "plenitude",
      highestShieldEarned: "plenitude",
      isProvisional: false,
      scoreAverage: 95,
      scoreAverageRounded: 95,
      evaluableDaysCount: 7,
      consecutiveLowDays: 0,
      lastEvaluatedDate: "2026-10-13",
      evaluatedAt: "2026-10-13T23:59:00Z",
      rulesVersion: "v0.11.3",
      recentAction: "promotion",
      reason: "Plenitude",
    };

    // Um único dia onde o paciente fez 0 pontos (média dos 7 dias cai para 81, patamar de Equilíbrio)
    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-08", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-10", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-11", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-12", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-13", score: 95 }),
      createScoreResult({ evaluatedDate: "2026-10-14", score: 0 }), // Dia ruim isolado
    ];

    const result = calculatePatientShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evs,
      currentState,
    });

    // Média = 570 / 7 = 81.43 (arredondado 81)
    expect(result.state.scoreAverageRounded).toBe(81);
    // NÃO regride! Escudo ativo mantido como Plenitude
    expect(result.state.activeShield).toBe("plenitude");
    expect(result.state.consecutiveLowDays).toBe(1);
    expect(result.state.recentAction).toBe("maintenance");
  });
});
