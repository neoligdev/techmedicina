// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const operator = "00000000-0000-4000-8000-000000000001";
const clinic = "00000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
  for (const file of ["001_tenant_foundation.sql", "006_domain_reservations.sql"])
    await db.exec(
      await readFile(new URL(`../../database/migrations/${file}`, import.meta.url), "utf8"),
    );
  await db.query("INSERT INTO public.tm_clinics(id,name) VALUES($1,'QA')", [clinic]);
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [operator],
  );
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [operator]);
  await db.exec("SET ROLE authenticated");
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("reserva hostname sem ativar e sem permitir takeover", async () => {
  const args = [clinic, "gestao.clinica.test", "clinic_portal"];
  const saved = await db.query<{ saved: { status: string } }>(
    "SELECT public.tm_reserve_domain($1,$2,$3) AS saved",
    args,
  );
  expect(saved.rows[0]?.saved.status).toBe("pending_verification");
  await expect(db.query("SELECT public.tm_reserve_domain($1,$2,$3)", args)).rejects.toMatchObject({
    code: "40001",
  });
  expect((await db.query("SELECT * FROM public.tm_domain_audit")).rows).toHaveLength(1);
  await expect(
    db.exec("UPDATE public.tm_clinic_domains SET status='active'"),
  ).rejects.toMatchObject({ code: "42501" });
});
it.each(["admin.test", "a.test:443", "a.test/other", "a..test", "A.test"])(
  "rejeita hostname inválido/reservado: %s",
  async (host) => {
    await expect(
      db.query("SELECT public.tm_reserve_domain($1,$2,$3)", [clinic, host, "patient_pwa"]),
    ).rejects.toMatchObject({ code: "22023" });
  },
);
it("conta comum não reserva nem consulta cadastro global", async () => {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
    "00000000-0000-4000-8000-000000000003",
  ]);
  expect((await db.query("SELECT * FROM public.tm_clinic_domains")).rows).toHaveLength(0);
  await expect(
    db.query("SELECT public.tm_reserve_domain($1,$2,$3)", [
      clinic,
      "app.clinica.test",
      "patient_pwa",
    ]),
  ).rejects.toMatchObject({ code: "42501" });
});
