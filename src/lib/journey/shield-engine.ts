import {
  SHIELD_IDS,
  SHIELD_TIERS,
  type ShieldId,
  type ShieldAction,
  type ShieldHistoryEvent,
  type PatientShieldState,
  type ShieldCalculationInput,
  type ShieldCalculationResult,
  type JourneyScoreResult,
  shieldCalculationInputSchema,
  shieldCalculationResultSchema,
  shieldHistoryEventSchema,
} from "@/features/journey/contracts";

/**
 * Cria a chave canônica de idempotência para transições e eventos de Escudos.
 * Garante unicidade e reproducibilidade lógica por clínica, paciente, data, ação e escudo.
 */
export function createShieldIdempotencyKey(
  clinicId: string,
  patientId: string,
  targetDate: string,
  action: string,
  shield: string,
): string {
  return `${clinicId}:${patientId}:${targetDate}:${action}:${shield}`;
}

/**
 * Gera um UUID determinístico de idempotência baseado em hash (RFC 4122 v5 compatível, variante 1)
 * a partir de uma chave de idempotência ou semente textual.
 * Totalmente seguro para execução no browser, Node e SSR sem dependências externas.
 */
export function generateDeterministicShieldUUID(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x27d4eb2f;
  let h4 = 0x165667b1;

  for (let i = 0; i < seed.length; i++) {
    const code = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x27d4eb2f);
    h3 = Math.imul(h3 ^ code, 0x9e3779b9);
    h4 = Math.imul(h4 ^ code, 0x85ebca6b);
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  const hex = `${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}`;

  const p1 = hex.slice(0, 8);
  const p2 = hex.slice(8, 12);
  // Versão 5 (determinístico baseado em hash)
  const p3 = "5" + hex.slice(13, 16);
  // Variante 1 (bits 10xx, com nibble entre 8 e b)
  const variantNibble = ((parseInt(hex[16] ?? "0", 16) & 0x3) | 0x8).toString(16);
  const p4 = variantNibble + hex.slice(17, 20);
  const p5 = hex.slice(20, 32);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

/**
 * Retorna o Escudo correspondente a uma pontuação diária ou média,
 * conforme os limiares canônicos estabelecidos no PRD v0.11.3 §11.5:
 * - Origem: 0 a 29
 * - Ritmo: 30 a 54
 * - Avanço: 55 a 74
 * - Equilíbrio: 75 a 89
 * - Plenitude: 90 a 100
 */
export function getShieldByScore(score: number): ShieldId {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  if (clamped <= 29) return "origem";
  if (clamped <= 54) return "ritmo";
  if (clamped <= 74) return "avanco";
  if (clamped <= 89) return "equilibrio";
  return "plenitude";
}

export interface SevenDayWindowCalculation {
  evaluableDaysCount: number;
  scoreAverage: number | null;
  scoreAverageRounded: number | null;
  isProvisional: boolean;
  consideredEvaluations: JourneyScoreResult[];
  ignoredCrossTenantCount: number;
  nonEvaluableDaysCount: number;
}

/**
 * Calcula a média móvel dos últimos 7 dias avaliáveis até a data de corte (targetDate).
 * Regras do PRD v0.11.3 §11.5:
 * 1. Não preenche dias ausentes com zero.
 * 2. Dias não avaliáveis (status === "not_evaluable") são excluídos do divisor.
 * 3. Amostra insuficiente (< 7 dias) gera média parcial marcada como isProvisional: true.
 * 4. Zero dias avaliáveis gera scoreAverage: null e isProvisional: true.
 * 5. Isolamento estrito de clinicId e patientId (dados de outros tenants são descartados).
 */
export function calculate7DayScoreAverage(
  evaluations: JourneyScoreResult[],
  targetDate: string,
  clinicId: string,
  patientId: string,
): SevenDayWindowCalculation {
  let ignoredCrossTenantCount = 0;
  let nonEvaluableDaysCount = 0;

  // Filtrar estritamente por clinicId e patientId
  const patientEvaluations = evaluations.filter((e) => {
    if (e.clinicId !== clinicId || e.patientId !== patientId) {
      ignoredCrossTenantCount++;
      return false;
    }
    return e.evaluatedDate <= targetDate;
  });

  // Ordenar cronologicamente por evaluatedDate crescente
  const sorted = [...patientEvaluations].sort((a, b) => {
    if (a.evaluatedDate !== b.evaluatedDate) {
      return a.evaluatedDate.localeCompare(b.evaluatedDate);
    }
    return a.evaluatedAt.localeCompare(b.evaluatedAt);
  });

  // Desduplicar avaliações da mesma data, retendo a mais recente
  const byDateMap = new Map<string, JourneyScoreResult>();
  for (const ev of sorted) {
    byDateMap.set(ev.evaluatedDate, ev);
  }

  // Filtrar apenas dias avaliáveis (status === "evaluated" e score !== null)
  const evaluableDailyScores: JourneyScoreResult[] = [];
  for (const ev of byDateMap.values()) {
    if (ev.status === "evaluated" && ev.score !== null) {
      evaluableDailyScores.push(ev);
    } else {
      nonEvaluableDaysCount++;
    }
  }

  // Selecionar os últimos 7 dias avaliáveis
  const considered = evaluableDailyScores.slice(-7);
  const count = considered.length;

  if (count === 0) {
    return {
      evaluableDaysCount: 0,
      scoreAverage: null,
      scoreAverageRounded: null,
      isProvisional: true,
      consideredEvaluations: [],
      ignoredCrossTenantCount,
      nonEvaluableDaysCount,
    };
  }

  const sum = considered.reduce((acc, curr) => acc + (curr.score ?? 0), 0);
  const avg = Number((sum / count).toFixed(2));
  const avgRounded = Math.round(sum / count);

  return {
    evaluableDaysCount: count,
    scoreAverage: avg,
    scoreAverageRounded: avgRounded,
    isProvisional: count < 7,
    consideredEvaluations: considered,
    ignoredCrossTenantCount,
    nonEvaluableDaysCount,
  };
}

/**
 * Motor determinístico de cálculo do Escudo ativo e regras de transição/regressão.
 * Implementa integralmente as diretrizes do PRD v0.11.3 §11.5 e Adendo de Vitalidade/Jornada/Escudos:
 * - 5 Escudos com limiares oficiais.
 * - Promoção imediata ao alcançar média do próximo escudo.
 * - Regressão controlada: requer 3 avaliações consecutivas válidas com média abaixo do limiar.
 * - 1 ou 2 dias com média baixa não causam regressão.
 * - Escudos já conquistados nunca desaparecem do histórico por regressão (highestShieldEarned preservado).
 * - Estado Origem provisório para clientes sem dias avaliados não polui o histórico imutável como conquista definitiva.
 * - Reprocessamentos idempotentes sem duplicação de eventos históricos.
 */
export function calculatePatientShield(input: ShieldCalculationInput): ShieldCalculationResult {
  const validatedInput = shieldCalculationInputSchema.parse(input);
  const {
    clinicId,
    patientId,
    targetDate,
    evaluations,
    currentState,
    existingHistory = [],
    options,
  } = validatedInput;

  const evaluatedAt = options?.evaluatedAt ?? new Date().toISOString();

  // 1. Calcular a média móvel dos últimos 7 dias avaliáveis
  const windowMetrics = calculate7DayScoreAverage(evaluations, targetDate, clinicId, patientId);

  const {
    evaluableDaysCount,
    scoreAverage,
    scoreAverageRounded,
    isProvisional,
    consideredEvaluations,
  } = windowMetrics;

  let activeShield: ShieldId;
  let highestShieldEarned: ShieldId;
  let consecutiveLowDays = 0;
  let action: ShieldAction;
  let reason: string;
  let newEventNeeded = false;

  // 2. Avaliação de estado e transições
  if (scoreAverageRounded === null) {
    // Cenário: Nenhum dia avaliável na janela (cliente novo ou sem registros)
    if (!currentState) {
      activeShield = "origem";
      highestShieldEarned = "origem";
      consecutiveLowDays = 0;
      action = "initial";
      reason =
        "Sem histórico de avaliações elegíveis na janela. Escudo inicial atribuído como Origem (provisório).";
      // Estado provisório sem dados NÃO deve ser registrado como conquista comprovada no histórico imutável
      newEventNeeded = false;
    } else {
      activeShield = currentState.activeShield;
      highestShieldEarned = currentState.highestShieldEarned;
      consecutiveLowDays = currentState.consecutiveLowDays;
      action = "maintenance";
      reason = "Sem dias avaliáveis na janela atual. Escudo anterior mantido sem penalização.";
      newEventNeeded = false;
    }
  } else {
    // Cenário: Há dias avaliáveis na janela móvel
    const indicatedShield = getShieldByScore(scoreAverageRounded);
    const indicatedRank = SHIELD_TIERS[indicatedShield].rank;

    if (!currentState || currentState.scoreAverage === null) {
      // Primeira conquista efetiva comprovada por avaliações válidas
      activeShield = indicatedShield;
      highestShieldEarned = indicatedShield;
      consecutiveLowDays = 0;
      action = "initial";
      reason = `Escudo inicial estabelecido como ${SHIELD_TIERS[indicatedShield].name} com média de ${scoreAverageRounded} pontos (${evaluableDaysCount} dias avaliáveis).`;
      newEventNeeded = true;
    } else {
      const currentActive = currentState.activeShield;
      const currentRank = SHIELD_TIERS[currentActive].rank;
      const currentHighest = currentState.highestShieldEarned;
      const highestRank = SHIELD_TIERS[currentHighest].rank;
      const prevLowDays = currentState.consecutiveLowDays;

      if (indicatedRank > currentRank) {
        // Promoção ou Reaquisição imediata
        activeShield = indicatedShield;
        consecutiveLowDays = 0; // Zera qualquer contagem de dias desfavoráveis

        if (indicatedRank > highestRank) {
          highestShieldEarned = indicatedShield;
          action = "promotion";
          reason = `Promoção conquistada para ${SHIELD_TIERS[indicatedShield].name} com média de ${scoreAverageRounded} pontos nos últimos ${evaluableDaysCount} dias avaliáveis.`;
        } else {
          highestShieldEarned = currentHighest;
          action = "reacquisition";
          reason = `Reaquisição do escudo ${SHIELD_TIERS[indicatedShield].name} com média de ${scoreAverageRounded} pontos nos últimos ${evaluableDaysCount} dias avaliáveis.`;
        }
        newEventNeeded = true;
      } else if (indicatedRank === currentRank) {
        // Manutenção de escudo no patamar atual
        activeShield = currentActive;
        highestShieldEarned = currentHighest;
        consecutiveLowDays = 0; // Média condizente com o escudo ativo zera os dias desfavoráveis
        action = "maintenance";
        reason = `Manutenção do escudo ${SHIELD_TIERS[currentActive].name} com média de ${scoreAverageRounded} pontos nos últimos ${evaluableDaysCount} dias avaliáveis.`;
        newEventNeeded = false;
      } else {
        // Média abaixo do limiar do Escudo Ativo -> Regra de Regressão Controlada (3 avaliações)
        const updatedLowDays = prevLowDays + 1;

        if (updatedLowDays < 3) {
          // 1 ou 2 avaliações consecutivas abaixo: escudo ativo é MANTIDO
          activeShield = currentActive;
          highestShieldEarned = currentHighest;
          consecutiveLowDays = updatedLowDays;
          action = "maintenance";
          reason = `Média de 7 dias (${scoreAverageRounded} pts) abaixo do limiar de ${SHIELD_TIERS[currentActive].name}, mas escudo mantido pela regra de regressão controlada (${updatedLowDays}/3 avaliações desfavoráveis consecutivas).`;
          newEventNeeded = false;
        } else {
          // 3ª avaliação consecutiva desfavorável: REGRESSÃO CONFIRMADA
          activeShield = indicatedShield;
          highestShieldEarned = currentHighest; // Histórico permanente: NUNCA perde o maior escudo
          consecutiveLowDays = 0; // Resetado após efetivação
          action = "regression";
          reason = `Regressão controlada confirmada após 3 avaliações consecutivas abaixo do limiar de ${SHIELD_TIERS[currentActive].name}. Novo escudo ativo: ${SHIELD_TIERS[indicatedShield].name} (média de ${scoreAverageRounded} pts). Maior escudo histórico preservado: ${SHIELD_TIERS[currentHighest].name}.`;
          newEventNeeded = true;
        }
      }
    }
  }

  // 3. Montar o estado atualizado do paciente
  const updatedState: PatientShieldState = {
    clinicId,
    patientId,
    activeShield,
    highestShieldEarned,
    isProvisional,
    scoreAverage,
    scoreAverageRounded,
    evaluableDaysCount,
    consecutiveLowDays,
    lastEvaluatedDate: targetDate,
    evaluatedAt,
    rulesVersion: "v0.11.3",
    recentAction: action,
    reason,
  };

  // 4. Tratamento de evento no histórico com garantia de idempotência
  let historyEvent: ShieldHistoryEvent | null = null;
  const updatedHistory = [...existingHistory];

  if (newEventNeeded) {
    const idempotencyKey = createShieldIdempotencyKey(
      clinicId,
      patientId,
      targetDate,
      action,
      activeShield,
    );
    const deterministicId = generateDeterministicShieldUUID(idempotencyKey);

    // Verificar se já existe evento idêntico para evitar duplicação em reprocessamentos
    const alreadyExists = existingHistory.some(
      (ev) =>
        ev.id === deterministicId ||
        ev.idempotencyKey === idempotencyKey ||
        (ev.patientId === patientId &&
          ev.evaluatedDate === targetDate &&
          ev.action === action &&
          ev.shield === activeShield),
    );

    if (alreadyExists) {
      historyEvent =
        existingHistory.find(
          (ev) =>
            ev.id === deterministicId ||
            ev.idempotencyKey === idempotencyKey ||
            (ev.patientId === patientId &&
              ev.evaluatedDate === targetDate &&
              ev.action === action &&
              ev.shield === activeShield),
        ) ?? null;
    } else {
      const previousShield = currentState?.activeShield ?? null;
      historyEvent = shieldHistoryEventSchema.parse({
        id: deterministicId,
        clinicId,
        patientId,
        action,
        shield: activeShield,
        previousShield,
        highestShieldEarned,
        idempotencyKey,
        evaluatedDate: targetDate,
        occurredAt: evaluatedAt,
        scoreAverage,
        evaluableDaysCount,
        consecutiveLowDays,
        vitalitySnapshot: null, // "jamais inventar valor" (PRD v0.11.3 §11.5)
        rulesVersion: "v0.11.3",
        reason,
      });

      updatedHistory.push(historyEvent);
    }
  }

  const result: ShieldCalculationResult = {
    clinicId,
    patientId,
    targetDate,
    state: updatedState,
    historyEvent,
    fullHistory: updatedHistory,
    consideredEvaluations,
    rulesVersion: "v0.11.3",
    summary: `Escudo ativo: ${SHIELD_TIERS[activeShield].name}. Média móvel 7 dias: ${scoreAverage !== null ? scoreAverage : "N/A"}. Dias avaliáveis: ${evaluableDaysCount}/7. Maior escudo: ${SHIELD_TIERS[highestShieldEarned].name}. Ação: ${action}.`,
  };

  return shieldCalculationResultSchema.parse(result);
}
