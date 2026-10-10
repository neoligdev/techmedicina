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
async function save(
  name: string,
  active: boolean,
  id: string | null = null,
  revision: number | null = null,
) {
  return (
    await db.query<{ clinic: { id: string; name: string; revision: number } }>(
      "SELECT public.tm_save_clinic($1,$2,$3,$4) AS clinic",
      [name, active, id, revision],
    )
  ).rows[0]!.clinic;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
  for (const migration of ["001_tenant_foundation.sql", "002_clinic_administration.sql"])
    await db.exec(
      await readFile(new URL(`../../database/migrations/${migration}`, import.meta.url), "utf8"),
    );
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES ($1,'super_admin',true)",
    [operator],
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});

describe.sequential("Escrita de clínicas e auditoria PostgreSQL", () => {
  it("anônimo não executa e conta comum não cria clínica", async () => {
    await asUser("", "anon");
    await expect(save("Clínica", false)).rejects.toMatchObject({ code: "42501" });
    await asUser(stranger);
    await expect(save("Clínica", false)).rejects.toMatchObject({ code: "42501" });
  });
  it("operador cria clínica e auditoria na mesma transação", async () => {
    await asUser(operator);
    const clinic = await save("  Clínica premium  ", false);
    clinicId = clinic.id;
    expect(clinic.name).toBe("Clínica premium");
    expect(clinic.revision).toBe(1);
    const audit = await db.query(
      "SELECT actor_user_id,clinic_id,action,changed_fields FROM public.tm_admin_audit",
    );
    expect(audit.rows).toEqual([
      {
        actor_user_id: operator,
        clinic_id: clinicId,
        action: "clinic_created",
        changed_fields: ["name", "is_active"],
      },
    ]);
  });
  it("edição usa revisão esperada e preserva autoria real", async () => {
    expect((await save("Clínica atualizada", true, clinicId, 1)).revision).toBe(2);
    await expect(save("Conflito", false, clinicId, 1)).rejects.toMatchObject({ code: "40001" });
    expect(
      (await db.query("SELECT count(*)::int AS total FROM public.tm_admin_audit")).rows,
    ).toEqual([{ total: 2 }]);
  });
  it("operador não escreve diretamente nem edita/exclui auditoria", async () => {
    await expect(db.exec("UPDATE public.tm_clinics SET name='Bypass'")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(db.exec("DELETE FROM public.tm_admin_audit")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(db.exec("INSERT INTO public.tm_admin_audit DEFAULT VALUES")).rejects.toMatchObject(
      { code: "42501" },
    );
  });
  it("entrada inválida não cria cadastro nem auditoria parcial", async () => {
    await expect(save(" ", false)).rejects.toMatchObject({ code: "22023" });
    await expect(save("Clínica", false, clinicId, null)).rejects.toMatchObject({ code: "22023" });
    expect(
      (await db.query("SELECT count(*)::int AS total FROM public.tm_admin_audit")).rows,
    ).toEqual([{ total: 2 }]);
    expect((await db.query("SELECT name,revision FROM public.tm_clinics")).rows).toEqual([
      { name: "Clínica atualizada", revision: 2 },
    ]);
  });
  it("conta comum não consulta clínica ou auditoria por identificador", async () => {
    await asUser(stranger);
    expect((await db.query("SELECT * FROM public.tm_admin_audit")).rows).toEqual([]);
    expect((await db.query("SELECT * FROM public.tm_clinics")).rows).toEqual([]);
    await expect(save("Outra clínica", false, clinicId, 2)).rejects.toMatchObject({
      code: "42501",
    });
  });
  it("operador inativado perde escrita imediatamente", async () => {
    await db.exec("RESET ROLE");
    await db.query("UPDATE public.tm_platform_operators SET is_active=false WHERE user_id=$1", [
      operator,
    ]);
    await asUser(operator);
    await expect(save("Não permitida", false)).rejects.toMatchObject({ code: "42501" });
  });
});
