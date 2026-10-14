// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { InMemoryShieldRepository } from "../features/journey/shield-repository";
import { ShieldService } from "../features/journey/shield-service";
import type { JourneyScoreResult } from "../features/journey/contracts";

const clinicA = "10000000-0000-4000-8000-000000000001";
const clinicB = "10000000-0000-4000-8000-000000000002";
const patientA = "20000000-0000-4000-8000-000000000001";
const patientB = "20000000-0000-4000-8000-000000000002";
const userA = "30000000-0000-4000-8000-000000000001";
const userB = "30000000-0000-4000-8000-000000000002";

function createScoreResult(partial: {
  clinicId?: string;
  patientId?: string;
  evaluatedDate: string;
  score: number | null;
  status?: "evaluated" | "not_evaluable";
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
    evaluatedAt: `${partial.evaluatedDate}T23:59:00Z`,
    summary: `Score: ${partial.score ?? "N/A"}`,
  };
}

describe("Camada de Persistência e Serviço de Escudos (Ciclo 003)", () => {
  // 1. Primeira conquista gravada de forma permanente
  it("1. grava a primeira conquista comprovada de forma atômica no estado e histórico", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-08", score: 60 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 60 }),
      createScoreResult({ evaluatedDate: "2026-10-10", score: 60 }),
    ];

    const result = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-10",
      evaluations: evs,
    });

    expect(result.state.activeShield).toBe("avanco");
    expect(result.state.highestShieldEarned).toBe("avanco");
    expect(result.state.recentAction).toBe("initial");
    expect(result.historyEvent).not.toBeNull();
    expect(result.historyEvent?.shield).toBe("avanco");

    // Validar diretamente no repositório persistido
    const persistedState = await repository.getState(clinicA, patientA);
    const persistedHistory = await repository.getHistory(clinicA, patientA);

    expect(persistedState).not.toBeNull();
    expect(persistedState?.activeShield).toBe("avanco");
    expect(persistedHistory).toHaveLength(1);
    expect(persistedHistory[0]!.shield).toBe("avanco");
  });

  // 2. Promoção de Escudo
  it("2. atualiza o estado e anexa o evento de promoção ao histórico permanente", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    // Estado inicial: Ritmo (média 40)
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-07",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-07", score: 40 })],
    });

    // 7 dias consecutivos com média 80 -> Promoção para Equilíbrio
    const evsPromotion = [
      createScoreResult({ evaluatedDate: "2026-10-08", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-09", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-10", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-11", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-12", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-13", score: 80 }),
      createScoreResult({ evaluatedDate: "2026-10-14", score: 80 }),
    ];

    const result = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evsPromotion,
    });

    expect(result.state.activeShield).toBe("equilibrio");
    expect(result.state.recentAction).toBe("promotion");

    const history = await repository.getHistory(clinicA, patientA);
    expect(history).toHaveLength(2); // Inicial (Ritmo) + Promoção (Equilíbrio)
    expect(history[1]!.action).toBe("promotion");
    expect(history[1]!.shield).toBe("equilibrio");
    expect(history[1]!.previousShield).toBe("ritmo");
  });

  // 3. Regressão controlada após 3 avaliações desfavoráveis
  it("3. mantém o escudo ativo em 1 e 2 avaliações ruins e regride somente na 3ª avaliação", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    // Conquista Plenitude (média 95)
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-07",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-07", score: 95 })],
    });

    const evsLow = [
      createScoreResult({ evaluatedDate: "2026-10-02", score: 30 }),
      createScoreResult({ evaluatedDate: "2026-10-03", score: 30 }),
      createScoreResult({ evaluatedDate: "2026-10-04", score: 30 }),
      createScoreResult({ evaluatedDate: "2026-10-05", score: 30 }),
      createScoreResult({ evaluatedDate: "2026-10-06", score: 30 }),
      createScoreResult({ evaluatedDate: "2026-10-07", score: 30 }),
      createScoreResult({ evaluatedDate: "2026-10-08", score: 30 }),
    ];

    // Dia 1 ruim (consecutiveLowDays = 1, escudo mantido)
    const res1 = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-08",
      evaluations: evsLow,
    });
    expect(res1.state.activeShield).toBe("plenitude");
    expect(res1.state.consecutiveLowDays).toBe(1);
    expect(await repository.getHistory(clinicA, patientA)).toHaveLength(1); // Sem evento de regressão

    // Dia 2 ruim (consecutiveLowDays = 2, escudo mantido)
    const res2 = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-09",
      evaluations: [
        ...evsLow.slice(1),
        createScoreResult({ evaluatedDate: "2026-10-09", score: 30 }),
      ],
    });
    expect(res2.state.activeShield).toBe("plenitude");
    expect(res2.state.consecutiveLowDays).toBe(2);
    expect(await repository.getHistory(clinicA, patientA)).toHaveLength(1);

    // Dia 3 ruim -> REGRESSÃO CONFIRMADA
    const res3 = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-10",
      evaluations: [
        ...evsLow.slice(2),
        createScoreResult({ evaluatedDate: "2026-10-10", score: 30 }),
      ],
    });
    expect(res3.state.activeShield).toBe("ritmo");
    expect(res3.state.consecutiveLowDays).toBe(0);
    expect(res3.state.recentAction).toBe("regression");

    // Histórico permanente registrou o evento de regressão
    const historyAfter = await repository.getHistory(clinicA, patientA);
    expect(historyAfter).toHaveLength(2);
    expect(historyAfter[1]!.action).toBe("regression");
    expect(historyAfter[1]!.shield).toBe("ritmo");
    expect(historyAfter[1]!.previousShield).toBe("plenitude");
  });

  // 4. Preservação do maior Escudo histórico
  it("4. nunca reduz highestShieldEarned mesmo após regressão para patamar inferior", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    // Estado inicial: Plenitude
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-07",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-07", score: 95 })],
    });

    // Força 3 avaliações baixas com score 10 (Origem)
    const evsLow = [createScoreResult({ evaluatedDate: "2026-10-08", score: 10 })];
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-08",
      evaluations: evsLow,
    });
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-09",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-09", score: 10 })],
    });
    const finalResult = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-10",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-10", score: 10 })],
    });

    expect(finalResult.state.activeShield).toBe("origem");
    // O maior escudo histórico PERMANECE PLENITUDE!
    expect(finalResult.state.highestShieldEarned).toBe("plenitude");

    const overview = await service.getPatientShieldOverview(clinicA, patientA);
    expect(overview.state.activeShield).toBe("origem");
    expect(overview.state.highestShieldEarned).toBe("plenitude");
  });

  // 5. Estado Origem provisório sem poluir histórico
  it("5. permite ao cliente novo visualizar Origem provisório sem poluir histórico de conquistas", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    // Avaliação com zero dias avaliados
    const result = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: [],
    });

    expect(result.state.activeShield).toBe("origem");
    expect(result.state.isProvisional).toBe(true);
    expect(result.state.scoreAverage).toBeNull();
    // Histórico de conquistas comprovadas permanece VAZIO
    expect(result.historyEvent).toBeNull();
    expect(result.fullHistory).toHaveLength(0);

    const historyInRepo = await repository.getHistory(clinicA, patientA);
    expect(historyInRepo).toHaveLength(0);
  });

  // 6. Consulta do cliente sem avaliações
  it("6. getPatientShieldOverview retorna estado provisório seguro para cliente sem dados", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    const overview = await service.getPatientShieldOverview(clinicA, patientA);
    expect(overview.state.activeShield).toBe("origem");
    expect(overview.state.isProvisional).toBe(true);
    expect(overview.state.scoreAverage).toBeNull();
    expect(overview.history).toHaveLength(0);
    expect(overview.tierInfo.id).toBe("origem");
    expect(overview.nextTier?.id).toBe("ritmo");
  });

  // 7. Reprocessamento idempotente
  it("7. garante que reprocessar a mesma data não duplica eventos no histórico", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    const evs = [
      createScoreResult({ evaluatedDate: "2026-10-12", score: 70 }),
      createScoreResult({ evaluatedDate: "2026-10-13", score: 70 }),
      createScoreResult({ evaluatedDate: "2026-10-14", score: 70 }),
    ];

    // Primeira execução
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evs,
    });

    const countAfterFirst = (await repository.getHistory(clinicA, patientA)).length;
    expect(countAfterFirst).toBe(1);

    // Segunda execução com dados e data idênticos
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evs,
    });

    // Quantidade de eventos no histórico não pode aumentar!
    const countAfterSecond = (await repository.getHistory(clinicA, patientA)).length;
    expect(countAfterSecond).toBe(1);
  });

  // 8. Concorrência entre atualizações
  it("8. rejeita gravações concorrentes conflitantes no mesmo paciente", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    // Simular concorrência bloqueando a chave
    repository.simulateLock(clinicA, patientA);

    await expect(
      service.evaluateAndPersistShield({
        clinicId: clinicA,
        patientId: patientA,
        targetDate: "2026-10-14",
        evaluations: [createScoreResult({ evaluatedDate: "2026-10-14", score: 50 })],
      }),
    ).rejects.toThrow("Concurrent shield update in progress");

    repository.releaseLock(clinicA, patientA);
  });

  // 9. Dados históricos corrigidos
  it("9. lida com correção de dados históricos sem apagar conquistas passadas", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    // 1º dia: score 50 (Ritmo)
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-10",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-10", score: 50 })],
    });

    // Correção posterior do dia 10 para score 80 (Equilíbrio)
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-10",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-10", score: 80 })],
    });

    const state = await repository.getState(clinicA, patientA);
    expect(state?.activeShield).toBe("equilibrio");
    expect(state?.highestShieldEarned).toBe("equilibrio");

    const history = await repository.getHistory(clinicA, patientA);
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  // 10. Persistência de eventos imutáveis
  it("10. preserva a lista sequencial de eventos históricos no repositório", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-01",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-01", score: 35 })],
    });

    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-02",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-02", score: 65 })],
    });

    const history = await repository.getHistory(clinicA, patientA);
    expect(history).toHaveLength(2);
    expect(history[0]!.shield).toBe("ritmo");
    expect(history[1]!.shield).toBe("avanco");
  });

  // 11. Recuperação do estado após reinicialização do serviço
  it("11. restaura fielmente o estado e histórico após reinicialização ou import de snapshot", async () => {
    const repo1 = new InMemoryShieldRepository();
    const service1 = new ShieldService(repo1);

    await service1.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-14", score: 95 })],
    });

    const snapshot = repo1.exportSnapshot();

    // Novo repositório (simulando reinicialização do pod/servidor)
    const repo2 = new InMemoryShieldRepository();
    repo2.importSnapshot(snapshot);
    const service2 = new ShieldService(repo2);

    const overview = await service2.getPatientShieldOverview(clinicA, patientA);
    expect(overview.state.activeShield).toBe("plenitude");
    expect(overview.state.highestShieldEarned).toBe("plenitude");
    expect(overview.history).toHaveLength(1);
    expect(overview.history[0]!.shield).toBe("plenitude");
  });

  // 12. Isolamento por clínica e cliente
  it("12. isola rigorosamente os estados e históricos entre Clínica A e Clínica B", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    // Paciente A na Clínica A (Plenitude)
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: [
        createScoreResult({
          clinicId: clinicA,
          patientId: patientA,
          evaluatedDate: "2026-10-14",
          score: 95,
        }),
      ],
    });

    // Paciente B na Clínica B (Ritmo)
    await service.evaluateAndPersistShield({
      clinicId: clinicB,
      patientId: patientB,
      targetDate: "2026-10-14",
      evaluations: [
        createScoreResult({
          clinicId: clinicB,
          patientId: patientB,
          evaluatedDate: "2026-10-14",
          score: 40,
        }),
      ],
    });

    const overviewA = await service.getPatientShieldOverview(clinicA, patientA);
    const overviewB = await service.getPatientShieldOverview(clinicB, patientB);

    expect(overviewA.state.activeShield).toBe("plenitude");
    expect(overviewB.state.activeShield).toBe("ritmo");

    // Consulta com IDs cruzados não retorna dados misturados
    const crossedState = await repository.getState(clinicA, patientB);
    expect(crossedState).toBeNull();
  });
});

describe("Validação PostgreSQL Real com PGlite e RLS (Migração 014)", () => {
  let db: PGlite;

  async function asUser(uid: string) {
    await db.exec("RESET ROLE");
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid]);
    await db.exec("SET ROLE authenticated");
  }

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      GRANT USAGE ON SCHEMA auth TO anon,authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
    `);

    // Carregar migrações base de tenant e jornada
    for (const file of [
      "001_tenant_foundation.sql",
      "008_journey_participation.sql",
      "009_journey_preferences.sql",
      "014_journey_shields.sql",
    ]) {
      const sql = await readFile(
        new URL(`../../database/migrations/${file}`, import.meta.url),
        "utf8",
      );
      await db.exec(sql);
    }

    // Criar clínicas de teste
    await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'Clinica A',true)", [
      clinicA,
    ]);
    await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'Clinica B',true)", [
      clinicB,
    ]);

    // Criar pacientes
    await db.query(
      "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
      [patientA, clinicA, userA],
    );
    await db.query(
      "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
      [patientB, clinicB, userB],
    );

    // Criar memberships
    await db.query(
      "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,patient_id) VALUES($1,$2,$3,'paciente',true,$4)",
      [userA, clinicA, userA, patientA],
    );
    await db.query(
      "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,patient_id) VALUES($1,$2,$3,'paciente',true,$4)",
      [userB, clinicB, userB, patientB],
    );

    // Médico da Clínica A com identidade médica verificada
    const doctorA = "30000000-0000-4000-8000-000000000099";
    const doctorMembershipA = "50000000-0000-4000-8000-000000000099";
    await db.query(
      "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,medical_identity_verified) VALUES($1,$2,$3,'medico',true,true)",
      [doctorMembershipA, clinicA, doctorA],
    );

    // Grants para leitura e atualização de escudos
    await db.query("INSERT INTO public.tm_membership_grants VALUES($1,'journey_shields','read')", [
      userA,
    ]);
    await db.query("INSERT INTO public.tm_membership_grants VALUES($1,'journey_shields','read')", [
      userB,
    ]);
    await db.query(
      "INSERT INTO public.tm_membership_grants VALUES($1,'journey_shields','write'),($1,'journey_shields','read')",
      [doctorMembershipA],
    );
  }, 60000);

  it("13. executa tm_save_patient_shield_transition e persiste com sucesso via RPC autorizada", async () => {
    const doctorA = "30000000-0000-4000-8000-000000000099";

    // 1. Paciente comum tentando gravar diretamente é barrado
    await asUser(userA);
    await expect(
      db.query(
        `SELECT public.tm_save_patient_shield_transition($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          clinicA,
          patientA,
          "plenitude",
          "plenitude",
          false,
          100.0,
          100,
          7,
          0,
          "2026-10-14",
          "initial",
          "Tentativa fraudulenta de paciente",
          null,
        ],
      ),
    ).rejects.toThrow("Shield transition write denied");

    // 2. Médico com grant de escrita grava legitimamente
    await asUser(doctorA);

    const historyEventPayload = {
      id: "40000000-0000-5000-8000-000000000001",
      idempotencyKey: `${clinicA}:${patientA}:2026-10-14:initial:avanco`,
      action: "initial",
      shield: "avanco",
      previousShield: null,
      highestShieldEarned: "avanco",
      evaluatedDate: "2026-10-14",
      scoreAverage: 65,
      evaluableDaysCount: 7,
      consecutiveLowDays: 0,
      reason: "Primeira conquista",
    };

    const res = await db.query<{
      tm_save_patient_shield_transition: {
        state: { active_shield: string; highest_shield_earned: string };
        event: { shield: string };
      };
    }>(
      `SELECT public.tm_save_patient_shield_transition($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        clinicA,
        patientA,
        "avanco",
        "avanco",
        false,
        65.0,
        65,
        7,
        0,
        "2026-10-14",
        "initial",
        "Primeira conquista",
        JSON.stringify(historyEventPayload),
      ],
    );

    const output = res.rows[0]!.tm_save_patient_shield_transition;
    expect(output.state.active_shield).toBe("avanco");
    expect(output.state.highest_shield_earned).toBe("avanco");
    expect(output.event.shield).toBe("avanco");
  });

  it("14. garante isolamento por RLS: Paciente B não pode ler os dados do Paciente A", async () => {
    // Como Paciente A: consegue ler sua linha
    await asUser(userA);
    const readA = await db.query(
      "SELECT * FROM public.tm_patient_shield_states WHERE clinic_id=$1 AND patient_id=$2",
      [clinicA, patientA],
    );
    expect(readA.rows).toHaveLength(1);

    // Como Paciente B da Clínica B: RLS bloqueia e retorna 0 linhas
    await asUser(userB);
    const readUnauthorized = await db.query(
      "SELECT * FROM public.tm_patient_shield_states WHERE clinic_id=$1 AND patient_id=$2",
      [clinicA, patientA],
    );
    expect(readUnauthorized.rows).toHaveLength(0);

    // Tentar executar RPC de transição para o Paciente A como Usuário B é rejeitado
    await expect(
      db.query(
        `SELECT public.tm_save_patient_shield_transition($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          clinicA,
          patientA,
          "plenitude",
          "plenitude",
          false,
          95,
          95,
          7,
          0,
          "2026-10-14",
          "promotion",
          "hack",
          null,
        ],
      ),
    ).rejects.toThrow("Shield transition write denied");
  });
});
