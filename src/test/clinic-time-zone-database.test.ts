// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const operator = "00000000-0000-4000-8000-000000000001";
const stranger = "00000000-0000-4000-8000-000000000002";
let db: PGlite;
let clinicId: string;

async function asUser(userId: string, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [userId]);
  await db.exec(`SET ROLE ${role === "anon" ? "anon" : "authenticated"}`);
}

async function saveClinic(
  name: string,
  active: boolean,
  id: string | null = null,
  revision: number | null = null,
  timeZone: string | null = null,
) {
  return (
    await db.query<{
      clinic: {
        id: string;
        name: string;
        is_active: boolean;
        time_zone: string | null;
        revision: number;
      };
    }>("SELECT public.tm_save_clinic($1,$2,$3,$4,$5) AS clinic", [
      name,
      active,
      id,
      revision,
      timeZone,
    ])
  ).rows[0]!.clinic;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);

  // Carrega 001, 002 e a nova migração 016
  for (const migration of [
    "001_tenant_foundation.sql",
    "002_clinic_administration.sql",
    "016_clinic_time_zone.sql",
  ]) {
    await db.exec(
      await readFile(new URL(`../../database/migrations/${migration}`, import.meta.url), "utf8"),
    );
  }

  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES ($1,'super_admin',true)",
    [operator],
  );
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe.sequential("Migração 016 - Persistência do Fuso Horário por Clínica (PGlite)", () => {
  it("anônimo e usuário comum não conseguem salvar clínica nem fuso horário", async () => {
    await asUser("", "anon");
    await expect(saveClinic("Clínica A", false, null, null, "America/Bahia")).rejects.toMatchObject(
      {
        code: "42501",
      },
    );

    await asUser(stranger);
    await expect(saveClinic("Clínica A", false, null, null, "America/Bahia")).rejects.toMatchObject(
      {
        code: "42501",
      },
    );
  });

  it("operador cria clínica sem fuso e o valor permanece NULL por padrão", async () => {
    await asUser(operator);
    const created = await saveClinic("Clínica Sem Fuso", false);
    clinicId = created.id;
    expect(created.name).toBe("Clínica Sem Fuso");
    expect(created.time_zone).toBeNull();
    expect(created.revision).toBe(1);

    const row = (
      await db.query<{ time_zone: string | null }>(
        "SELECT time_zone FROM public.tm_clinics WHERE id = $1",
        [clinicId],
      )
    ).rows[0];
    expect(row?.time_zone).toBeNull();
  });

  it("operador cria clínica com fuso IANA válido e auditoria registra time_zone", async () => {
    await asUser(operator);
    const clinicBahia = await saveClinic("Clínica Salvador", true, null, null, "America/Bahia");
    expect(clinicBahia.time_zone).toBe("America/Bahia");
    expect(clinicBahia.revision).toBe(1);

    const audit = (
      await db.query<{ changed_fields: string[] }>(
        "SELECT changed_fields FROM public.tm_admin_audit WHERE clinic_id = $1 ORDER BY occurred_at DESC LIMIT 1",
        [clinicBahia.id],
      )
    ).rows[0];
    expect(audit?.changed_fields).toContain("time_zone");
  });

  it("atualização de fuso horário altera o valor, incrementa revisão e audita a alteração", async () => {
    await asUser(operator);
    // Atualiza clínica criada anteriormente definindo fuso para America/Sao_Paulo
    const updated = await saveClinic("Clínica Sem Fuso", true, clinicId, 1, "America/Sao_Paulo");
    expect(updated.revision).toBe(2);
    expect(updated.time_zone).toBe("America/Sao_Paulo");

    const audit = (
      await db.query<{ changed_fields: string[] }>(
        "SELECT changed_fields FROM public.tm_admin_audit WHERE clinic_id = $1 ORDER BY occurred_at DESC LIMIT 1",
        [clinicId],
      )
    ).rows[0];
    expect(audit?.changed_fields).toEqual(["is_active", "time_zone"]);
  });

  it("atualização mantendo o mesmo fuso não duplica registro em changed_fields", async () => {
    await asUser(operator);
    const updated = await saveClinic(
      "Clínica Sem Fuso Renomeada",
      true,
      clinicId,
      2,
      "America/Sao_Paulo",
    );
    expect(updated.revision).toBe(3);

    const audit = (
      await db.query<{ changed_fields: string[] }>(
        "SELECT changed_fields FROM public.tm_admin_audit WHERE clinic_id = $1 ORDER BY occurred_at DESC LIMIT 1",
        [clinicId],
      )
    ).rows[0];
    expect(audit?.changed_fields).toEqual(["name"]);
  });

  it("atualização de nome sem informar fuso preserva o fuso horário existente", async () => {
    await asUser(operator);
    // Envia timeZone = null (omitido) ao atualizar nome da clínica
    const updated = await saveClinic("Clínica Nome Atualizado", true, clinicId, 3, null);
    expect(updated.revision).toBe(4);
    expect(updated.name).toBe("Clínica Nome Atualizado");
    // Fuso cadastrado anteriormente continua preservado
    expect(updated.time_zone).toBe("America/Sao_Paulo");

    const audit = (
      await db.query<{ changed_fields: string[] }>(
        "SELECT changed_fields FROM public.tm_admin_audit WHERE clinic_id = $1 ORDER BY occurred_at DESC LIMIT 1",
        [clinicId],
      )
    ).rows[0];
    // Apenas name foi alterado; time_zone NÃO foi modificado
    expect(audit?.changed_fields).toEqual(["name"]);
  });

  it("atualização de status sem informar fuso preserva o fuso horário existente", async () => {
    await asUser(operator);
    const updated = await saveClinic("Clínica Nome Atualizado", false, clinicId, 4, null);
    expect(updated.revision).toBe(5);
    expect(updated.is_active).toBe(false);
    expect(updated.time_zone).toBe("America/Sao_Paulo");

    const audit = (
      await db.query<{ changed_fields: string[] }>(
        "SELECT changed_fields FROM public.tm_admin_audit WHERE clinic_id = $1 ORDER BY occurred_at DESC LIMIT 1",
        [clinicId],
      )
    ).rows[0];
    expect(audit?.changed_fields).toEqual(["is_active"]);
  });

  it("chamada legada com 4 parâmetros posicionais preserva o fuso horário existente", async () => {
    await asUser(operator);
    // Chamada exatamente com 4 parâmetros sem fornecer o 5º parâmetro
    const res = await db.query<{
      clinic: {
        id: string;
        name: string;
        is_active: boolean;
        time_zone: string | null;
        revision: number;
      };
    }>("SELECT public.tm_save_clinic($1, $2, $3, $4) AS clinic", [
      "Clínica Chamada Legada",
      true,
      clinicId,
      5,
    ]);
    const legacySaved = res.rows[0]!.clinic;
    expect(legacySaved.revision).toBe(6);
    expect(legacySaved.name).toBe("Clínica Chamada Legada");
    expect(legacySaved.time_zone).toBe("America/Sao_Paulo");

    // Reativa para os próximos testes
    const row = (
      await db.query<{ time_zone: string | null }>(
        "SELECT time_zone FROM public.tm_clinics WHERE id = $1",
        [clinicId],
      )
    ).rows[0];
    expect(row?.time_zone).toBe("America/Sao_Paulo");
  });

  it("revisão concorrente desatualizada é rejeitada com código 40001", async () => {
    await asUser(operator);
    await expect(saveClinic("Conflito", true, clinicId, 2, "America/Manaus")).rejects.toMatchObject(
      { code: "40001" },
    );
  });

  it("fuso sintaticamente válido mas inexistente no IANA é rejeitado com código 22023", async () => {
    await asUser(operator);
    // America/CidadeInexistente passa por regex mas não existe em pg_catalog.pg_timezone_names
    await expect(
      saveClinic("Clínica Fake TZ", true, null, null, "America/CidadeInexistente"),
    ).rejects.toMatchObject({ code: "22023" });
  });

  it("tentativa de remover fuso com string vazia é rejeitada com código 22023", async () => {
    await asUser(operator);
    await expect(saveClinic("Clínica Vazia TZ", true, clinicId, 6, "   ")).rejects.toMatchObject({
      code: "22023",
    });
  });

  it("fuso com caracteres inválidos ou injeção é rejeitado com código 22023", async () => {
    await asUser(operator);
    await expect(
      saveClinic("Clínica Inválida", true, null, null, "Invalid/Fuso; DROP TABLE tm_clinics;"),
    ).rejects.toMatchObject({ code: "22023" });

    await expect(
      saveClinic("Clínica Inválida", true, null, null, "America/Sao Paulo"), // Espaço interno não permitido
    ).rejects.toMatchObject({ code: "22023" });
  });

  it("operador não pode executar UPDATE direto na tabela ignorando a RPC e a auditoria", async () => {
    await asUser(operator);
    await expect(
      db.exec("UPDATE public.tm_clinics SET time_zone = 'America/Manaus'"),
    ).rejects.toMatchObject({ code: "42501" });
  });
});
