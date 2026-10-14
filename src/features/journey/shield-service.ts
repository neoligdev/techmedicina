import {
  type PatientShieldState,
  type ShieldHistoryEvent,
  type JourneyScoreResult,
  type ShieldCalculationResult,
  type PatientShieldOverview,
  type RequesterContext,
  type ShieldProgressInfo,
  SHIELD_TIERS,
} from "./contracts";
import { calculatePatientShield } from "@/lib/journey/shield-engine";
import type { ShieldRepository } from "./shield-repository";

export interface EvaluateShieldOptions {
  timeZone?: string;
  evaluatedAt?: string;
  requester?: RequesterContext;
}

/**
 * Serviço de aplicação para orquestração da avaliação de Escudos,
 * persistência transacional com controle de concorrência e consulta autorizada para o PWA.
 */
export class ShieldService {
  constructor(private readonly repository: ShieldRepository) {}

  /**
   * Avalia a janela móvel de 7 dias, calcula o Escudo e persiste o novo estado
   * e evento de histórico de forma atômica e idempotente.
   *
   * Bloqueia terminantemente tentativas de execução direta por pacientes comuns.
   */
  async evaluateAndPersistShield(input: {
    clinicId: string;
    patientId: string;
    targetDate: string;
    evaluations: JourneyScoreResult[];
    options?: EvaluateShieldOptions;
  }): Promise<ShieldCalculationResult> {
    const { clinicId, patientId, targetDate, evaluations, options } = input;
    const requester = options?.requester;

    // Validação estrita de autorização: pacientes comuns NUNCA podem disparar cálculo/persistência direta de escudos
    if (requester) {
      if (requester.role === "paciente") {
        throw new Error(
          "Access denied: patients cannot mutate shield calculations or history directly",
        );
      }
      if (requester.clinicId && requester.clinicId !== clinicId) {
        throw new Error("Access denied: cross-clinic mutation prohibited");
      }
    }

    // 1. Recuperar o estado atual e o histórico existente do repositório
    const currentState = await this.repository.getState(clinicId, patientId);
    const existingHistory = await this.repository.getHistory(clinicId, patientId);

    // 2. Executar o motor determinístico de domínio
    const calculation = calculatePatientShield({
      clinicId,
      patientId,
      targetDate,
      evaluations,
      currentState,
      existingHistory,
      options,
    });

    // 3. Persistir o novo estado e o evento histórico (quando houver) no repositório
    await this.repository.saveTransition({
      clinicId,
      patientId,
      state: calculation.state,
      event: calculation.historyEvent,
    });

    // 4. Retornar o resultado atualizado
    return calculation;
  }

  /**
   * Recupera o resumo do Escudo ativo, métricas da janela e histórico consolidado do cliente,
   * ideal para exibição na tela PWA "Meus Escudos" e no painel clínico.
   *
   * Garante isolamento multiempresa e impede que pacientes leiam dados de terceiros.
   */
  async getPatientShieldOverview(
    clinicId: string,
    patientId: string,
    requester?: RequesterContext,
  ): Promise<PatientShieldOverview> {
    // Validação de acesso multiempresa e privacidade
    if (requester) {
      if (requester.clinicId && requester.clinicId !== clinicId) {
        throw new Error("Access denied: cross-clinic access prohibited");
      }
      if (
        requester.role === "paciente" &&
        requester.patientId &&
        requester.patientId !== patientId
      ) {
        throw new Error("Access denied: patients cannot access third-party shield data");
      }
    }

    const state = await this.repository.getState(clinicId, patientId);
    const history = await this.repository.getHistory(clinicId, patientId);

    // Se o cliente ainda não tiver estado persistido, retorna o estado inicial provisório em Origem
    const resolvedState: PatientShieldState = state ?? {
      clinicId,
      patientId,
      activeShield: "origem",
      highestShieldEarned: "origem",
      isProvisional: true,
      scoreAverage: null,
      scoreAverageRounded: null,
      evaluableDaysCount: 0,
      consecutiveLowDays: 0,
      lastEvaluatedDate: null,
      evaluatedAt: new Date().toISOString(),
      rulesVersion: "v0.11.3",
      recentAction: "initial",
      reason: "Estado inicial provisório sem registros de pontuação na janela.",
    };

    const currentTier = SHIELD_TIERS[resolvedState.activeShield];
    const tiersList = Object.values(SHIELD_TIERS).sort((a, b) => a.rank - b.rank);
    const nextTier = tiersList.find((t) => t.rank === currentTier.rank + 1) ?? null;

    // Cálculo métrico de progresso para a tela PWA "Meus Escudos"
    let pointsNeededToNextTier = 0;
    let progressPercentage = 0;

    if (nextTier) {
      if (resolvedState.scoreAverageRounded !== null) {
        pointsNeededToNextTier = Math.max(0, nextTier.minScore - resolvedState.scoreAverageRounded);
        const tierRange = nextTier.minScore - currentTier.minScore;
        const scoreWithinTier = Math.max(
          0,
          resolvedState.scoreAverageRounded - currentTier.minScore,
        );
        progressPercentage = Math.min(100, Math.round((scoreWithinTier / tierRange) * 100));
      } else {
        pointsNeededToNextTier = nextTier.minScore;
        progressPercentage = 0;
      }
    } else {
      // Já está em Plenitude (máximo)
      pointsNeededToNextTier = 0;
      progressPercentage = 100;
    }

    const progress: ShieldProgressInfo = {
      currentRank: currentTier.rank,
      nextTierId: nextTier?.id ?? null,
      nextTierName: nextTier?.name ?? null,
      nextTierMinScore: nextTier?.minScore ?? null,
      pointsNeededToNextTier,
      progressPercentage,
      daysRemainingInWindow: Math.max(0, 7 - resolvedState.evaluableDaysCount),
      consecutiveLowDays: resolvedState.consecutiveLowDays,
      isAtRiskOfRegression: resolvedState.consecutiveLowDays >= 2,
    };

    return {
      clinicId,
      patientId,
      state: resolvedState,
      history,
      tierInfo: currentTier,
      nextTier,
      progress,
    };
  }
}
