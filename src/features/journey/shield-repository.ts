import {
  type PatientShieldState,
  type ShieldHistoryEvent,
  patientShieldStateSchema,
  shieldHistoryEventSchema,
  SHIELD_TIERS,
} from "./contracts";

export interface ShieldRepository {
  getState(clinicId: string, patientId: string): Promise<PatientShieldState | null>;
  getHistory(clinicId: string, patientId: string): Promise<ShieldHistoryEvent[]>;
  saveTransition(params: {
    clinicId: string;
    patientId: string;
    state: PatientShieldState;
    event: ShieldHistoryEvent | null;
  }): Promise<{ state: PatientShieldState; event: ShieldHistoryEvent | null }>;
}

/**
 * Repositório em memória para persistência local, simulação de concorrência,
 * isolamento multiempresa e reinicialização de serviço com snapshot.
 */
export class InMemoryShieldRepository implements ShieldRepository {
  // Mapa de estados por chave composta "clinicId:patientId"
  private states = new Map<string, PatientShieldState>();
  // Mapa de histórico por chave composta "clinicId:patientId" -> lista append-only de eventos
  private histories = new Map<string, ShieldHistoryEvent[]>();
  // Conjunto de chaves de idempotência para evitar qualquer gravação duplicada
  private idempotencyKeys = new Set<string>();
  // Bloqueios simples para controle de concorrência
  private locks = new Set<string>();

  private makeKey(clinicId: string, patientId: string): string {
    return `${clinicId}:${patientId}`;
  }

  async getState(clinicId: string, patientId: string): Promise<PatientShieldState | null> {
    const key = this.makeKey(clinicId, patientId);
    const state = this.states.get(key);
    return state ? JSON.parse(JSON.stringify(state)) : null;
  }

  async getHistory(clinicId: string, patientId: string): Promise<ShieldHistoryEvent[]> {
    const key = this.makeKey(clinicId, patientId);
    const history = this.histories.get(key) ?? [];
    return JSON.parse(JSON.stringify(history));
  }

  async saveTransition(params: {
    clinicId: string;
    patientId: string;
    state: PatientShieldState;
    event: ShieldHistoryEvent | null;
  }): Promise<{ state: PatientShieldState; event: ShieldHistoryEvent | null }> {
    const { clinicId, patientId, state, event } = params;
    const key = this.makeKey(clinicId, patientId);

    // Controle de concorrência: simula bloqueio transacional FOR UPDATE / advisory lock
    if (this.locks.has(key)) {
      throw new Error("Concurrent shield update in progress. Please retry.");
    }
    this.locks.add(key);

    try {
      // Validação estrita dos contratos
      const validatedState = patientShieldStateSchema.parse(state);

      // Proteção de integridade física: o maior escudo histórico é monotonicamente não-decrescente
      const existingState = this.states.get(key);
      if (existingState) {
        const existingRank = SHIELD_TIERS[existingState.highestShieldEarned].rank;
        const newRank = SHIELD_TIERS[validatedState.highestShieldEarned].rank;
        if (existingRank > newRank) {
          validatedState.highestShieldEarned = existingState.highestShieldEarned;
        }
      }

      this.states.set(key, validatedState);

      let savedEvent: ShieldHistoryEvent | null = null;

      if (event) {
        const validatedEvent = shieldHistoryEventSchema.parse(event);
        const idempotencyKey =
          validatedEvent.idempotencyKey ??
          `${clinicId}:${patientId}:${validatedEvent.evaluatedDate}:${validatedEvent.action}:${validatedEvent.shield}`;

        const fullIdempotencyKey = `${key}:${idempotencyKey}`;

        // Garantir que a mesma chave de idempotência nunca duplique o evento no ledger imutável
        if (!this.idempotencyKeys.has(fullIdempotencyKey)) {
          this.idempotencyKeys.add(fullIdempotencyKey);
          const history = this.histories.get(key) ?? [];
          history.push(validatedEvent);
          this.histories.set(key, history);
          savedEvent = validatedEvent;
        } else {
          // Já existia: recupera do histórico existente sem duplicar
          const history = this.histories.get(key) ?? [];
          savedEvent =
            history.find(
              (e) =>
                e.id === validatedEvent.id ||
                e.idempotencyKey === idempotencyKey ||
                (e.evaluatedDate === validatedEvent.evaluatedDate &&
                  e.action === validatedEvent.action &&
                  e.shield === validatedEvent.shield),
            ) ?? validatedEvent;
        }
      }

      return {
        state: JSON.parse(JSON.stringify(validatedState)),
        event: savedEvent ? JSON.parse(JSON.stringify(savedEvent)) : null,
      };
    } finally {
      this.locks.delete(key);
    }
  }

  /**
   * Exporta os dados atuais para simular reinicialização ou persistência persistente.
   */
  exportSnapshot(): string {
    return JSON.stringify({
      states: Array.from(this.states.entries()),
      histories: Array.from(this.histories.entries()),
      idempotencyKeys: Array.from(this.idempotencyKeys.values()),
    });
  }

  /**
   * Restaura um snapshot exportado para validar recuperação após reinicialização do serviço.
   */
  importSnapshot(snapshot: string): void {
    const data = JSON.parse(snapshot) as {
      states: [string, PatientShieldState][];
      histories: [string, ShieldHistoryEvent[]][];
      idempotencyKeys: string[];
    };
    this.states = new Map(data.states);
    this.histories = new Map(data.histories);
    this.idempotencyKeys = new Set(data.idempotencyKeys);
    this.locks.clear();
  }

  /**
   * Simula um bloqueio de concorrência para fins de teste de isolamento e corrida.
   */
  simulateLock(clinicId: string, patientId: string): void {
    this.locks.add(this.makeKey(clinicId, patientId));
  }

  /**
   * Libera um bloqueio de concorrência simulado.
   */
  releaseLock(clinicId: string, patientId: string): void {
    this.locks.delete(this.makeKey(clinicId, patientId));
  }
}
