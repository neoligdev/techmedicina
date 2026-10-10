// @vitest-environment node
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { parsePersistedIdentity } from "../lib/auth/persisted-identity";
import { isAuthorized } from "../lib/auth/core";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const doctorA = uuid(1),
  doctorB = uuid(2),
  adminA = uuid(3),
  patientA = uuid(4),
  operator = uuid(5);
const clinicA = uuid(101),
  clinicB = uuid(102),
  patient = uuid(201);
let db: PGlite;
async function asUser(userId: string) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec("SET ROLE authenticated");
}
async function resolved() {
  const result = await db.query<{ identity: unknown }>(
    "SELECT public.tm_resolve_identity() AS identity",
  );
  return result.rows[0]!.identity;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  `);
  await db.exec(
    await readFile(
      new URL("../../database/migrations/001_tenant_foundation.sql", import.meta.url),
      "utf8",
    ),
  );
  for (const id of [doctorA, doctorB, adminA, patientA, operator])
    await db.query("INSERT INTO auth.users (id) VALUES ($1)", [id]);
  await db.query(
    "INSERT INTO public.tm_clinics(id,name,is_active) VALUES ($1,'Clínica A',true),($2,'Clínica B',true)",
    [clinicA, clinicB],
  );
  await db.query(
    "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES ($1,$2,$3,true)",
    [patient, clinicA, patientA],
  );
  for (const [id, clinic, user, role, patientId] of [
    [uuid(301), clinicA, doctorA, "medico", null],
    [uuid(302), clinicB, doctorB, "medico", null],
    [uuid(303), clinicA, adminA, "admin", null],
    [uuid(304), clinicA, patientA, "paciente", patient],
  ])
    await db.query(
      "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,patient_id,is_active,medical_identity_verified) VALUES ($1,$2,$3,$4,$5,true,$6)",
      [id, clinic, user, role, patientId, role === "medico"],
    );
  await db.query(
    "INSERT INTO public.tm_membership_grants VALUES ($1,'prontuario','read'),($2,'prontuario','read'),($3,'agenda','read')",
    [uuid(301), uuid(302), uuid(304)],
  );
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES ($1,'super_admin',true)",
    [operator],
  );
}, 30000);
beforeEach(async () => {
  await db.exec(
    "RESET ROLE; UPDATE public.tm_clinics SET is_active=true; UPDATE public.tm_memberships SET is_active=true; UPDATE public.tm_patients SET is_active=true;",
  );
});
afterAll(async () => {
  await db?.close();
});

describe("C013 PostgreSQL real em memória — RLS e integridade", () => {
  it("anônimo não lê tabelas nem executa o resolvedor", async () => {
    await db.exec("SET ROLE anon");
    await expect(db.query("SELECT * FROM public.tm_clinics")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(resolved()).rejects.toMatchObject({ code: "42501" });
  });
  it("médico A não vê clínica, vínculos ou grants da clínica B", async () => {
    await asUser(doctorA);
    expect((await db.query("SELECT id FROM public.tm_clinics")).rows).toEqual([{ id: clinicA }]);
    expect((await db.query("SELECT user_id FROM public.tm_memberships")).rows).toEqual([
      { user_id: doctorA },
    ]);
    expect((await db.query("SELECT membership_id FROM public.tm_membership_grants")).rows).toEqual([
      { membership_id: uuid(301) },
    ]);
    expect(
      (await db.query("SELECT * FROM public.tm_memberships WHERE clinic_id=$1", [clinicB])).rows,
    ).toEqual([]);
  });
  it("médico B permanece restrito a B", async () => {
    await asUser(doctorB);
    expect((await db.query("SELECT id FROM public.tm_clinics")).rows).toEqual([{ id: clinicB }]);
    const identity = parsePersistedIdentity(await resolved(), doctorB)!;
    expect(identity.links.map((link) => link.clinicId)).toEqual([clinicB]);
  });
  it("resolve grants persistidos e o motor rejeita clínica/paciente externos", async () => {
    await asUser(doctorA);
    const identity = parsePersistedIdentity(await resolved(), doctorA)!;
    expect(identity.links[0]!.medicalIdentityVerified).toBe(true);
    expect(
      isAuthorized({ identity, currentClinicId: clinicA }, "prontuario", "read", {
        ownerClinicId: clinicA,
        ownerPatientId: patient,
        patientLink: { clinicId: clinicA, patientId: patient, isActive: true },
      }),
    ).toBe(true);
    expect(
      isAuthorized({ identity, currentClinicId: clinicB }, "prontuario", "read", {
        ownerClinicId: clinicB,
        ownerPatientId: patient,
      }),
    ).toBe(false);
  });
  it("usuário não pode se promover, criar vínculos nem conceder grants", async () => {
    await asUser(adminA);
    await expect(
      db.query("UPDATE public.tm_memberships SET medical_identity_verified=true"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("INSERT INTO public.tm_platform_operators(user_id,role) VALUES ($1,'super_admin')", [
        adminA,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("INSERT INTO public.tm_membership_grants VALUES ($1,'faturamento','manage')", [
        uuid(303),
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("DELETE FROM public.tm_memberships")).rejects.toMatchObject({
      code: "42501",
    });
  });
  it("Super ADM vê cadastros de clínicas mas não obtém vínculo médico ou pacientes", async () => {
    await asUser(operator);
    expect((await db.query("SELECT id FROM public.tm_clinics")).rows).toHaveLength(2);
    expect((await db.query("SELECT * FROM public.tm_patients")).rows).toEqual([]);
    const identity = parsePersistedIdentity(await resolved(), operator)!;
    expect(identity.globalRole).toBe("super_admin");
    expect(identity.links).toEqual([]);
    expect(isAuthorized({ identity, currentClinicId: clinicA }, "prontuario", "read")).toBe(false);
  });
  it("claims de papel no token não criam privilégios", async () => {
    await asUser(adminA);
    await db.query("SELECT set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ role: "super_admin", user_metadata: { role: "super_admin" } }),
    ]);
    const identity = parsePersistedIdentity(await resolved(), adminA)!;
    expect(identity.globalRole).toBeUndefined();
    expect(identity.links[0]!.grants).toEqual([]);
  });
  it("clínica inativa remove vínculo do resultado na próxima consulta", async () => {
    await db.query("UPDATE public.tm_clinics SET is_active=false WHERE id=$1", [clinicA]);
    await asUser(doctorA);
    expect(parsePersistedIdentity(await resolved(), doctorA)!.links).toEqual([]);
    expect((await db.query("SELECT * FROM public.tm_clinics")).rows).toEqual([]);
  });
  it("inativar vínculo remove autorização sem alterar identidade", async () => {
    await db.query("UPDATE public.tm_memberships SET is_active=false WHERE user_id=$1", [doctorA]);
    await asUser(doctorA);
    expect(parsePersistedIdentity(await resolved(), doctorA)).toEqual({
      userId: doctorA,
      links: [],
    });
  });
  it("paciente acessa somente sua associação ativa; inativação remove vínculo", async () => {
    await asUser(patientA);
    expect((await db.query("SELECT id FROM public.tm_patients")).rows).toEqual([{ id: patient }]);
    expect(parsePersistedIdentity(await resolved(), patientA)!.links[0]!.patientId).toBe(patient);
    await db.exec("RESET ROLE");
    await db.query("UPDATE public.tm_patients SET is_active=false WHERE id=$1", [patient]);
    await asUser(patientA);
    expect(parsePersistedIdentity(await resolved(), patientA)!.links).toEqual([]);
  });
  it("FK composta bloqueia paciente ligado a outra clínica ou outra conta", async () => {
    await expect(
      db.query(
        "INSERT INTO public.tm_memberships(clinic_id,user_id,role,patient_id) VALUES ($1,$2,'paciente',$3)",
        [clinicB, patientA, patient],
      ),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      db.query(
        "INSERT INTO public.tm_memberships(clinic_id,user_id,role,patient_id) VALUES ($1,$2,'paciente',$3)",
        [clinicA, operator, patient],
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });
  it("rejeita vínculos duplicados e papel global como vínculo local", async () => {
    await expect(
      db.query(
        "INSERT INTO public.tm_memberships(clinic_id,user_id,role) VALUES ($1,$2,'medico')",
        [clinicA, doctorA],
      ),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      db.query(
        "INSERT INTO public.tm_memberships(clinic_id,user_id,role) VALUES ($1,$2,'super_admin')",
        [clinicB, operator],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
