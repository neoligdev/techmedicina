// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { InMemoryShieldRepository } from "../features/journey/shield-repository";
import { ShieldService } from "../features/journey/shield-service";
import type { JourneyScoreResult, RequesterContext } from "../features/journey/contracts";

const clinicA = "10000000-0000-4000-8000-000000000001";
const clinicB = "10000000-0000-4000-8000-000000000002";
const patientA = "20000000-0000-4000-8000-000000000001";
const patientB = "20000000-0000-4000-8000-000000000002";
const userPatientA = "30000000-0000-4000-8000-000000000001";
const userPatientB = "30000000-0000-4000-8000-000000000002";
const userDoctorA = "30000000-0000-4000-8000-000000000010";
const userDoctorB = "30000000-0000-4000-8000-000000000020";
const userSuperAdmin = "30000000-0000-4000-8000-000000000099";

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

describe("TECHMEDICINA — Ciclo 004: Consolidação e Segurança de Escudos", () => {
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

    // 1. Clínicas
    await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'Clinica A',true)", [
      clinicA,
    ]);
    await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'Clinica B',true)", [
      clinicB,
    ]);

    // 2. Pacientes
    await db.query(
      "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
      [patientA, clinicA, userPatientA],
    );
    await db.query(
      "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
      [patientB, clinicB, userPatientB],
    );

    // 3. Memberships dos Pacientes
    await db.query(
      "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,patient_id) VALUES('50000000-0000-4000-8000-000000000001',$1,$2,'paciente',true,$3)",
      [clinicA, userPatientA, patientA],
    );
    await db.query(
      "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,patient_id) VALUES('50000000-0000-4000-8000-000000000002',$1,$2,'paciente',true,$3)",
      [clinicB, userPatientB, patientB],
    );

    // 4. Médicos
    await db.query(
      "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,medical_identity_verified) VALUES('50000000-0000-4000-8000-000000000010',$1,$2,'medico',true,true)",
      [clinicA, userDoctorA],
    );
    await db.query(
      "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,medical_identity_verified) VALUES('50000000-0000-4000-8000-000000000020',$1,$2,'medico',true,true)",
      [clinicB, userDoctorB],
    );

    // 5. Super Admin Operador
    await db.query(
      "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
      [userSuperAdmin],
    );

    // 6. Grants
    await db.query(
      "INSERT INTO public.tm_membership_grants VALUES('50000000-0000-4000-8000-000000000001','journey_shields','read')",
    );
    await db.query(
      "INSERT INTO public.tm_membership_grants VALUES('50000000-0000-4000-8000-000000000002','journey_shields','read')",
    );
    await db.query(
      "INSERT INTO public.tm_membership_grants VALUES('50000000-0000-4000-8000-000000000010','journey_shields','write'),('50000000-0000-4000-8000-000000000010','journey_shields','read')",
    );
    await db.query(
      "INSERT INTO public.tm_membership_grants VALUES('50000000-0000-4000-8000-000000000020','journey_shields','write'),('50000000-0000-4000-8000-000000000020','journey_shields','read')",
    );
  }, 60000);

  // 1. Tentativa de atribuição fraudulenta de Plenitude
  it("1. bloqueia tentativa de paciente comum atribuir fraudulentamente o escudo Plenitude", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    const requesterPatient: RequesterContext = {
      userId: userPatientA,
      role: "paciente",
      patientId: patientA,
      clinicId: clinicA,
    };

    // Tentativa via ShieldService com contexto de paciente
    await expect(
      service.evaluateAndPersistShield({
        clinicId: clinicA,
        patientId: patientA,
        targetDate: "2026-10-14",
        evaluations: [createScoreResult({ evaluatedDate: "2026-10-14", score: 98 })],
        options: { requester: requesterPatient },
      }),
    ).rejects.toThrow(
      "Access denied: patients cannot mutate shield calculations or history directly",
    );

    // Tentativa direta no banco via RPC chamando como paciente comum
    await asUser(userPatientA);
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
          "Fraude forjada",
          null,
        ],
      ),
    ).rejects.toThrow("Shield transition write denied");
  });

  // 2. Modificação indevida do maior Escudo conquistado
  it("2. impede modificação indevida ou rebaixamento do maior Escudo conquistado", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    // Paciente conquista Avanço legitimamente
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-10",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-10", score: 65 })],
    });

    const stateAfterEarn = await repository.getState(clinicA, patientA);
    expect(stateAfterEarn?.highestShieldEarned).toBe("avanco");

    // Tentativa de salvar estado direto rebaixando highestShieldEarned para 'origem'
    await repository.saveTransition({
      clinicId: clinicA,
      patientId: patientA,
      state: {
        ...stateAfterEarn!,
        highestShieldEarned: "origem",
        activeShield: "origem",
      },
      event: null,
    });

    const stateAfterTamper = await repository.getState(clinicA, patientA);
    expect(stateAfterTamper?.highestShieldEarned).toBe("avanco"); // Protegido!

    // No PostgreSQL via RPC: primeiro persiste como Avanço
    await asUser(userDoctorA);
    await db.query(
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
        "2026-10-10",
        "initial",
        "Primeira conquista",
        null,
      ],
    );

    // Em seguida, mesmo passando highest_shield = 'origem', tm_shield_rank impede diminuição
    const rpcRes = await db.query<{
      tm_save_patient_shield_transition: {
        state: { highest_shield_earned: string };
      };
    }>(
      `SELECT public.tm_save_patient_shield_transition($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        clinicA,
        patientA,
        "ritmo",
        "origem", // tentativa de rebaixar
        false,
        45.0,
        45,
        7,
        0,
        "2026-10-14",
        "maintenance",
        "Manutencao",
        null,
      ],
    );
    expect(rpcRes.rows[0]!.tm_save_patient_shield_transition.state.highest_shield_earned).toBe(
      "avanco",
    );
  });

  // 3. Alteração maliciosa de pontuação
  it("3. bloqueia alteração maliciosa de pontuação calculando estritamente sobre avaliações reais", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    // Paciente tem avaliações reais com média 35 (Ritmo)
    const result = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: [
        createScoreResult({ evaluatedDate: "2026-10-12", score: 35 }),
        createScoreResult({ evaluatedDate: "2026-10-13", score: 35 }),
        createScoreResult({ evaluatedDate: "2026-10-14", score: 35 }),
      ],
    });

    // O resultado calculado é estritamente derivado da matemática determinística
    expect(result.state.scoreAverageRounded).toBe(35);
    expect(result.state.activeShield).toBe("ritmo");
  });

  // 4. Gravação de evento histórico falsificado
  it("4. rejeita mutação ou adulteração de eventos históricos no ledger (trigger imutável)", async () => {
    await asUser(userDoctorA);

    const historyPayload = {
      id: "40000000-0000-5000-8000-000000000099",
      idempotencyKey: `${clinicA}:${patientA}:2026-10-14:initial:avanco`,
      action: "initial",
      shield: "avanco",
      previousShield: null,
      highestShieldEarned: "avanco",
      evaluatedDate: "2026-10-14",
      scoreAverage: 65,
      evaluableDaysCount: 7,
      consecutiveLowDays: 0,
      reason: "Conquista legítima",
    };

    // Grava evento inicial legítimo
    await db.query(
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
        "Conquista legítima",
        JSON.stringify(historyPayload),
      ],
    );

    // Como superuser/postgres (onde permissões de tabela existem), o trigger deve disparar e barrar
    await db.exec("RESET ROLE");

    // Tentativa maliciosa de executar UPDATE no histórico deve ser barrada pelo trigger
    await expect(
      db.query(
        "UPDATE public.tm_shield_history_events SET shield='plenitude' WHERE patient_id=$1",
        [patientA],
      ),
    ).rejects.toThrow("Historical shield events are strictly immutable");

    // Tentativa maliciosa de executar DELETE no histórico também deve ser barrada
    await expect(
      db.query("DELETE FROM public.tm_shield_history_events WHERE patient_id=$1", [patientA]),
    ).rejects.toThrow("Historical shield events are strictly immutable");
  });

  // 5. Tentativa de acesso entre clínicas
  it("5. bloqueia tentativa de acesso cruzado entre clínicas", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    const requesterDoctorB: RequesterContext = {
      userId: userDoctorB,
      role: "medico",
      clinicId: clinicB,
    };

    // Médico da Clínica B tentando acessar dados do Paciente da Clínica A
    await expect(
      service.getPatientShieldOverview(clinicA, patientA, requesterDoctorB),
    ).rejects.toThrow("Access denied: cross-clinic access prohibited");

    // Tentativa no banco
    await asUser(userDoctorB);
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

  // 6. Primeira conquista com duas operações simultâneas
  it("6. protege a primeira conquista contra condições de corrida via advisory lock", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    const evs = [
      createScoreResult({ patientId: patientB, evaluatedDate: "2026-10-12", score: 60 }),
      createScoreResult({ patientId: patientB, evaluatedDate: "2026-10-13", score: 60 }),
      createScoreResult({ patientId: patientB, evaluatedDate: "2026-10-14", score: 60 }),
    ];

    // Duas requisições simultâneas para o mesmo paciente novo
    const [res1, res2] = await Promise.all([
      service.evaluateAndPersistShield({
        clinicId: clinicA,
        patientId: patientB, // paciente novo
        targetDate: "2026-10-14",
        evaluations: evs,
      }),
      service.evaluateAndPersistShield({
        clinicId: clinicA,
        patientId: patientB,
        targetDate: "2026-10-14",
        evaluations: evs,
      }),
    ]);

    expect(res1.state.activeShield).toBe("avanco");
    expect(res2.state.activeShield).toBe("avanco");

    // O histórico não foi duplicado
    const history = await repository.getHistory(clinicA, patientB);
    expect(history).toHaveLength(1);
  });

  // 7. Atualizações simultâneas do mesmo cliente
  it("7. serializa ou rejeita atualizações concorrentes em conflito para o mesmo cliente", async () => {
    const repository = new InMemoryShieldRepository();
    repository.simulateLock(clinicA, patientA);

    await expect(
      repository.saveTransition({
        clinicId: clinicA,
        patientId: patientA,
        state: {
          clinicId: clinicA,
          patientId: patientA,
          activeShield: "avanco",
          highestShieldEarned: "avanco",
          isProvisional: false,
          scoreAverage: 60,
          scoreAverageRounded: 60,
          evaluableDaysCount: 3,
          consecutiveLowDays: 0,
          lastEvaluatedDate: "2026-10-14",
          evaluatedAt: new Date().toISOString(),
          rulesVersion: "v0.11.3",
          recentAction: "initial",
          reason: "lock test",
        },
        event: null,
      }),
    ).rejects.toThrow("Concurrent shield update in progress");

    repository.releaseLock(clinicA, patientA);
  });

  // 8. Reprocessamento idempotente
  it("8. garante que reprocessamento da mesma data e pontuação é 100% idempotente", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    const evs = [createScoreResult({ evaluatedDate: "2026-10-14", score: 75 })];

    const run1 = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evs,
    });

    const run2 = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: evs,
    });

    expect(run1.state.activeShield).toBe(run2.state.activeShield);
    const history = await repository.getHistory(clinicA, patientA);
    expect(history).toHaveLength(1);
  });

  // 9. Correção de dados históricos
  it("9. preserva conquistas passadas e maior escudo ao reprocessar dados históricos corrigidos", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    // 1. Paciente conquista Equilíbrio (80 pontos)
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-10",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-10", score: 80 })],
    });

    // 2. Dado corrigido no dia seguinte: média cai para 30 (Ritmo)
    const correctedRun = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-11",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-11", score: 30 })],
    });

    // Escudo mais alto conquistado deve permanecer Equilíbrio
    expect(correctedRun.state.highestShieldEarned).toBe("equilibrio");
    const history = await repository.getHistory(clinicA, patientA);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]!.shield).toBe("equilibrio");
  });

  // 10. Falha transacional sem gravação parcial
  it("10. não grava dados parciais quando ocorre falha transacional", async () => {
    const repository = new InMemoryShieldRepository();

    const invalidState = {
      clinicId: clinicA,
      patientId: patientA,
      activeShield: "escudo_inexistente", // Viola schema
    } as unknown as Parameters<typeof repository.saveTransition>[0]["state"];

    await expect(
      repository.saveTransition({
        clinicId: clinicA,
        patientId: patientA,
        state: invalidState,
        event: null,
      }),
    ).rejects.toThrow();

    const state = await repository.getState(clinicA, patientA);
    expect(state).toBeNull();
  });

  // 11. Origem provisório
  it("11. exibe Origem provisório sem registrar evento definitivo no ledger histórico", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    const result = await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: [], // Sem dias avaliados
    });

    expect(result.state.activeShield).toBe("origem");
    expect(result.state.isProvisional).toBe(true);
    expect(result.historyEvent).toBeNull();

    const history = await repository.getHistory(clinicA, patientA);
    expect(history).toHaveLength(0); // Ledger permanece limpo!
  });

  // 12. Consulta autorizada pelo próprio cliente
  it("12. permite consulta autorizada pelo próprio cliente com métricas de progresso PWA", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    // Paciente conquista Ritmo com 40 pontos
    await service.evaluateAndPersistShield({
      clinicId: clinicA,
      patientId: patientA,
      targetDate: "2026-10-14",
      evaluations: [createScoreResult({ evaluatedDate: "2026-10-14", score: 40 })],
    });

    const requesterPatient: RequesterContext = {
      userId: userPatientA,
      role: "paciente",
      patientId: patientA,
      clinicId: clinicA,
    };

    const overview = await service.getPatientShieldOverview(clinicA, patientA, requesterPatient);

    expect(overview.clinicId).toBe(clinicA);
    expect(overview.patientId).toBe(patientA);
    expect(overview.state.activeShield).toBe("ritmo");
    expect(overview.tierInfo.name).toBe("Ritmo");
    expect(overview.nextTier?.id).toBe("avanco");
    // Próximo piso é 55. Atual é 40. Faltam 15 pontos.
    expect(overview.progress.pointsNeededToNextTier).toBe(15);
    expect(overview.progress.progressPercentage).toBeGreaterThanOrEqual(0);
    expect(overview.progress.daysRemainingInWindow).toBe(6);
  });

  // 13. Rejeição de consulta de terceiros
  it("13. rejeita tentativa de paciente consultar dados de escudo de outro paciente", async () => {
    const repository = new InMemoryShieldRepository();
    const service = new ShieldService(repository);

    const requesterPatientA: RequesterContext = {
      userId: userPatientA,
      role: "paciente",
      patientId: patientA,
      clinicId: clinicA,
    };

    // Paciente A tentando ler Paciente B na mesma clínica
    await expect(
      service.getPatientShieldOverview(clinicA, patientB, requesterPatientA),
    ).rejects.toThrow("Access denied: patients cannot access third-party shield data");

    // Tentativa no PostgreSQL via RPC tm_get_patient_shield_overview
    // Paciente B tentando ler dados do Paciente A
    await asUser(userPatientB);
    await expect(
      db.query("SELECT public.tm_get_patient_shield_overview($1,$2)", [clinicA, patientA]),
    ).rejects.toThrow("Access denied");
  });
});
