// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
const clinic = "00000000-0000-4000-8000-000000000001",
  patient = "00000000-0000-4000-8000-000000000002",
  doctor = "00000000-0000-4000-8000-000000000003",
  goal = "00000000-0000-4000-8000-000000000004",
  other = "00000000-0000-4000-8000-000000000005";
let db: PGlite;
async function as(user: string) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("SET ROLE authenticated");
}
async function pause(version = 1) {
  return db.query<{ value: { status: string; version: number } }>(
    "SELECT public.tm_pause_journey_goal($1,$2) AS value",
    [goal, version],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;",
  );
  for (const file of [
    "001_tenant_foundation.sql",
    "008_journey_participation.sql",
    "009_journey_preferences.sql",
    "010_journey_goal_pause.sql",
    "011_journey_goal_read.sql",
  ])
    await db.exec(
      await readFile(new URL(`../../database/migrations/${file}`, import.meta.url), "utf8"),
    );
  await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'QA',true)", [clinic]);
  await db.query(
    "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$1,true)",
    [patient, clinic],
  );
  await db.query(
    "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,medical_identity_verified,patient_id) VALUES($1,$2,$1,'medico',true,true,null),($3,$2,$3,'paciente',true,false,$3)",
    [doctor, clinic, patient],
  );
  await db.query(
    "INSERT INTO public.tm_membership_grants VALUES($1,'journey_goals','write'),($1,'journey_goals','read'),($2,'journey_goals','read'),($2,'journey_events','create')",
    [doctor, patient],
  );
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [other],
  );
  await db.query(
    "INSERT INTO public.tm_journey_goals(id,clinic_id,patient_id,patient_user_id,version,policy_version_id,kind,cadence,status,effective_from) VALUES($1,$2,$3,$3,1,$1,'hydration','daily','eligible',now()-interval '1 day')",
    [goal, clinic, patient],
  );
  await db.query(
    "INSERT INTO public.tm_journey_preferences(clinic_id,patient_id,patient_user_id,is_enabled) VALUES($1,$2,$2,true)",
    [clinic, patient],
  );
  await as(patient);
  await db.query("SELECT public.tm_submit_journey_self_report($1,$2,now()-interval '1 minute')", [
    goal,
    other,
  ]);
}, 30000);
beforeEach(async () => {
  await db.exec(
    "RESET ROLE; DELETE FROM public.tm_journey_goal_audit; UPDATE public.tm_journey_goals SET status='eligible',version=1; UPDATE public.tm_memberships SET medical_identity_verified=true WHERE role='medico'; UPDATE public.tm_patients SET is_active=true; UPDATE public.tm_clinics SET is_active=true;",
  );
});
afterAll(async () => {
  await db?.close();
});
it("leitura médica exige clínica correta, identidade verificada e paciente ativo", async () => {
  await as(doctor);
  const result = await db.query<{
    value: {
      goal: { id: string };
      patientLink: { clinicId: string; patientId: string; isActive: boolean };
    };
  }>("SELECT public.tm_get_journey_goal_for_doctor($1,$2) AS value", [goal, clinic]);
  expect(result.rows[0]!.value).toMatchObject({
    goal: { id: goal },
    patientLink: { clinicId: clinic, patientId: patient, isActive: true },
  });
  await expect(
    db.query("SELECT public.tm_get_journey_goal_for_doctor($1,$2)", [goal, other]),
  ).rejects.toMatchObject({ code: "42501" });
  await as(patient);
  await expect(
    db.query("SELECT public.tm_get_journey_goal_for_doctor($1,$2)", [goal, clinic]),
  ).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_patients SET is_active=false WHERE id=$1", [patient]);
  await as(doctor);
  await expect(
    db.query("SELECT public.tm_get_journey_goal_for_doctor($1,$2)", [goal, clinic]),
  ).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_patients SET is_active=true WHERE id=$1", [patient]);
  await db.query("UPDATE public.tm_memberships SET medical_identity_verified=false WHERE id=$1", [
    doctor,
  ]);
  await as(doctor);
  await expect(
    db.query("SELECT public.tm_get_journey_goal_for_doctor($1,$2)", [goal, clinic]),
  ).rejects.toMatchObject({ code: "42501" });
});
it("médico autorizado suspende com versão e auditoria; não altera eventos passados", async () => {
  await as(doctor);
  expect((await pause()).rows[0]!.value).toMatchObject({ status: "paused", version: 2 });
  const audit = await db.query("SELECT * FROM public.tm_journey_goal_audit");
  expect(audit.rows).toHaveLength(1);
  expect(audit.rows[0]).toMatchObject({
    actor_user_id: doctor,
    previous_version: 1,
    goal_version: 2,
  });
  await db.exec("RESET ROLE");
  expect(
    (await db.query("SELECT goal_version FROM public.tm_journey_events")).rows[0],
  ).toMatchObject({ goal_version: 1 });
  await as(patient);
  await expect(
    db.query("SELECT public.tm_submit_journey_self_report($1,$2,now())", [goal, doctor]),
  ).rejects.toMatchObject({ code: "42501" });
});
it("versão antiga conflita e repetir pausa atual não duplica auditoria", async () => {
  await as(doctor);
  await pause();
  await expect(pause()).rejects.toMatchObject({ code: "40001" });
  await pause(2);
  expect((await db.query("SELECT * FROM public.tm_journey_goal_audit")).rows).toHaveLength(1);
});
it("paciente e cargo global não suspendem metas", async () => {
  for (const user of [patient, other]) {
    await as(user);
    await expect(pause()).rejects.toMatchObject({ code: "42501" });
  }
});
it("médico verificado com grant em outra clínica não suspende meta alheia", async () => {
  await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'QA B',true)", [
    other,
  ]);
  await db.query(
    "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,medical_identity_verified) VALUES($1,$1,$1,'medico',true,true)",
    [other],
  );
  await db.query("INSERT INTO public.tm_membership_grants VALUES($1,'journey_goals','write')", [
    other,
  ]);
  await as(other);
  await expect(pause()).rejects.toMatchObject({ code: "42501" });
  expect((await db.query("SELECT * FROM public.tm_journey_goal_audit")).rows).toHaveLength(0);
});
it("médico sem verificação não suspende nem lê auditoria", async () => {
  await db.query("UPDATE public.tm_memberships SET medical_identity_verified=false WHERE id=$1", [
    doctor,
  ]);
  await as(doctor);
  await expect(pause()).rejects.toMatchObject({ code: "42501" });
  expect((await db.query("SELECT * FROM public.tm_journey_goal_audit")).rows).toHaveLength(0);
});
it("escrita direta e remoção de auditoria continuam negadas", async () => {
  await as(doctor);
  await expect(
    db.exec("UPDATE public.tm_journey_goals SET status='eligible'"),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(db.exec("DELETE FROM public.tm_journey_goal_audit")).rejects.toMatchObject({
    code: "42501",
  });
});
