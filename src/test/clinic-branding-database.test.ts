// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import {
  clinicBrandingPreferencesSchema,
  clinicBrandingWriteSchema,
  savedClinicBrandingSchema,
} from "../features/auth/clinic-branding";

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const operator = uid(1),
  admin = uid(2),
  doctor = uid(3),
  stranger = uid(4),
  patient = uid(5);
const preferences = {
  name: "Clínica azul",
  primary: "#B9D85D",
  secondary: "#56B9C5",
  mode: "dark",
};
let db: PGlite;
let clinicA: string;
let clinicB: string;
async function asUser(id: string, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`SET ROLE ${role === "anon" ? "anon" : "authenticated"}`);
}
async function save(clinicId: string, value: unknown, revision: number) {
  const result = await db.query<{ branding: unknown }>(
    "SELECT public.tm_save_branding($1,$2::jsonb,$3) AS branding",
    [clinicId, JSON.stringify(value), revision],
  );
  return savedClinicBrandingSchema.parse(result.rows[0]!.branding);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
  for (const name of [
    "001_tenant_foundation.sql",
    "002_clinic_administration.sql",
    "003_clinic_branding.sql",
  ])
    await db.exec(
      await readFile(new URL(`../../database/migrations/${name}`, import.meta.url), "utf8"),
    );
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [operator],
  );
  await asUser(operator);
  const created = await db.query<{ clinic: { id: string } }>(
    "SELECT public.tm_save_clinic('Clínica A',true) AS clinic UNION ALL SELECT public.tm_save_clinic('Clínica B',true)",
  );
  clinicA = created.rows[0]!.clinic.id;
  clinicB = created.rows[1]!.clinic.id;
  await db.exec("RESET ROLE");
  await db.query(
    "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
    [uid(10), clinicA, patient],
  );
  await db.query(
    `INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,patient_id) VALUES
    ($1,$2,$3,'admin',true,null),($4,$2,$5,'medico',true,null),($6,$2,$7,'paciente',true,$8)`,
    [uid(20), clinicA, admin, uid(21), doctor, uid(22), patient, uid(10)],
  );
  await db.query(
    "INSERT INTO public.tm_membership_grants(membership_id,resource,action) VALUES($1,'cadastro_clinica','write'),($2,'cadastro_clinica','write')",
    [uid(20), uid(21)],
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});

describe.sequential("Identidade visual por clínica — PostgreSQL local", () => {
  it("anônimo e conta sem vínculo não gravam", async () => {
    await asUser("", "anon");
    await expect(save(clinicA, preferences, 0)).rejects.toMatchObject({ code: "42501" });
    await asUser(stranger);
    await expect(save(clinicA, preferences, 0)).rejects.toMatchObject({ code: "42501" });
  });
  it("operador cria identidades separadas com auditoria sem valores", async () => {
    await asUser(operator);
    expect((await save(clinicA, preferences, 0)).revision).toBe(1);
    expect(
      (await save(clinicB, { ...preferences, name: "Outra clínica", mode: "light" }, 0)).revision,
    ).toBe(1);
    const rows = (
      await db.query(
        "SELECT clinic_id,preferences FROM public.tm_clinic_branding ORDER BY clinic_id",
      )
    ).rows;
    expect(rows).toHaveLength(2);
    const audit = (
      await db.query(
        "SELECT actor_user_id,changed_fields FROM public.tm_admin_audit WHERE action='branding_updated'",
      )
    ).rows;
    expect(audit).toHaveLength(2);
    expect(audit[0]).toEqual({
      actor_user_id: operator,
      changed_fields: ["mode", "name", "primary", "secondary"],
    });
  });
  it("admin altera apenas sua clínica e usa revisão atual", async () => {
    await asUser(admin);
    expect((await save(clinicA, { ...preferences, name: "Marca própria" }, 1)).revision).toBe(2);
    await expect(save(clinicB, preferences, 1)).rejects.toMatchObject({ code: "42501" });
    await expect(save(clinicA, preferences, 1)).rejects.toMatchObject({ code: "40001" });
    await expect(save(clinicA, preferences, 0)).rejects.toMatchObject({ code: "40001" });
    expect((await db.query("SELECT clinic_id FROM public.tm_clinic_branding")).rows).toEqual([
      { clinic_id: clinicA },
    ]);
  });
  it("médico e paciente leem identidade própria mas não editam", async () => {
    for (const id of [doctor, patient]) {
      await asUser(id);
      expect((await db.query("SELECT clinic_id FROM public.tm_clinic_branding")).rows).toEqual([
        { clinic_id: clinicA },
      ]);
      await expect(save(clinicA, preferences, 2)).rejects.toMatchObject({ code: "42501" });
    }
  });
  it("escrita direta e auditoria por administrador local são negadas", async () => {
    await asUser(admin);
    await expect(db.exec("UPDATE public.tm_clinic_branding SET revision=99")).rejects.toMatchObject(
      { code: "42501" },
    );
    await expect(db.exec("DELETE FROM public.tm_clinic_branding")).rejects.toMatchObject({
      code: "42501",
    });
    expect((await db.query("SELECT * FROM public.tm_admin_audit")).rows).toEqual([]);
  });
  it("JSON inválido e imagens não autorizadas não alteram estado/auditoria", async () => {
    await asUser(operator);
    const before = (await db.query("SELECT count(*)::int AS count FROM public.tm_admin_audit"))
      .rows;
    for (const value of [
      { ...preferences, role: "super_admin" },
      { ...preferences, primary: "red" },
      { ...preferences, logo: "javascript:alert(1)" },
      { ...preferences, logo: "data:image/png;base64,aGVsbG8=" },
      { ...preferences, favicon: null },
      { ...preferences, name: " ".repeat(81) },
      null,
    ])
      await expect(save(clinicA, value, 2)).rejects.toMatchObject({ code: "22023" });
    expect(
      (await db.query("SELECT count(*)::int AS count FROM public.tm_admin_audit")).rows,
    ).toEqual(before);
  });
  it("imagem de formato permitido e remoção são auditadas por campo", async () => {
    await asUser(admin);
    const logo = "data:image/png;base64,iVBORw0KGgo=";
    expect((await save(clinicA, { ...preferences, logo }, 2)).preferences.logo).toBe(logo);
    expect((await save(clinicA, preferences, 3)).revision).toBe(4);
    await asUser(operator);
    const rows = (
      await db.query(
        "SELECT actor_user_id,changed_fields FROM public.tm_admin_audit WHERE action='branding_updated' ORDER BY occurred_at DESC,id DESC",
      )
    ).rows;
    expect(rows[0]).toEqual({ actor_user_id: admin, changed_fields: ["logo"] });
  });
  it("revogação do grant impede nova gravação; clínica e paciente inativos não leem", async () => {
    await db.exec("RESET ROLE");
    await db.query("DELETE FROM public.tm_membership_grants WHERE membership_id=$1", [uid(20)]);
    await asUser(admin);
    await expect(save(clinicA, preferences, 4)).rejects.toMatchObject({ code: "42501" });
    await db.exec("RESET ROLE");
    await db.query("UPDATE public.tm_patients SET is_active=false WHERE id=$1", [uid(10)]);
    await asUser(patient);
    expect((await db.query("SELECT * FROM public.tm_clinic_branding")).rows).toEqual([]);
    await asUser(operator);
    await db.query("SELECT public.tm_save_clinic('Clínica A',false,$1,1)", [clinicA]);
    await asUser(doctor);
    expect((await db.query("SELECT * FROM public.tm_clinic_branding")).rows).toEqual([]);
    await asUser(stranger);
    expect((await db.query("SELECT * FROM public.tm_clinic_branding")).rows).toEqual([]);
  });
});
describe("Contrato de identidade visual", () => {
  it("recusa campos administrativos, versões inválidas e formatos arbitrários", () => {
    expect(
      clinicBrandingWriteSchema.safeParse({ clinicId: uid(100), preferences, expectedRevision: 0 })
        .success,
    ).toBe(true);
    for (const value of [
      { ...preferences, actor_user_id: operator },
      { ...preferences, name: "" },
      { ...preferences, logo: "https://example.com/logo.svg" },
      { ...preferences, mode: "system" },
    ])
      expect(clinicBrandingPreferencesSchema.safeParse(value).success).toBe(false);
    expect(
      clinicBrandingWriteSchema.safeParse({ clinicId: uid(100), preferences, expectedRevision: -1 })
        .success,
    ).toBe(false);
  });
});
