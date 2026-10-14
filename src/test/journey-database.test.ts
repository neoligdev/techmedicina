// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const clinic = "00000000-0000-4000-8000-000000000001",
  patient = "00000000-0000-4000-8000-000000000002",
  user = "00000000-0000-4000-8000-000000000003",
  goal = "00000000-0000-4000-8000-000000000004",
  event = "00000000-0000-4000-8000-000000000005",
  doctor = "00000000-0000-4000-8000-000000000006",
  other = "00000000-0000-4000-8000-000000000007";
let occurred: string;
async function as(uid: string) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid]);
  await db.exec("SET ROLE authenticated");
}
async function submit(id = event, at = occurred) {
  return db.query<{ event: { id: string } }>(
    "SELECT public.tm_submit_journey_self_report($1,$2,$3) AS event",
    [goal, id, at],
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
  ])
    await db.exec(
      await readFile(new URL(`../../database/migrations/${file}`, import.meta.url), "utf8"),
    );
  await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'QA',true)", [clinic]);
  await db.query(
    "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
    [patient, clinic, user],
  );
  await db.query(
    "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,patient_id) VALUES($1,$2,$3,'paciente',true,$4)",
    [user, clinic, user, patient],
  );
  await db.query(
    "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,medical_identity_verified) VALUES($1,$2,$1,'medico',true,true)",
    [doctor, clinic],
  );
  await db.query(
    "INSERT INTO public.tm_membership_grants VALUES($1,'journey_events','create'),($1,'journey_events','read'),($1,'journey_goals','read'),($2,'journey_events','read'),($2,'journey_goals','read')",
    [user, doctor],
  );
  await db.query(
    "INSERT INTO public.tm_journey_goals(id,clinic_id,patient_id,patient_user_id,version,policy_version_id,kind,cadence,status,effective_from) VALUES($1,$2,$3,$4,1,$1,'hydration','daily','eligible',now()-interval '1 day')",
    [goal, clinic, patient, user],
  );
  await db.query(
    "INSERT INTO public.tm_journey_preferences(clinic_id,patient_id,patient_user_id,is_enabled) VALUES($1,$2,$3,true)",
    [clinic, patient, user],
  );
  occurred = (
    await db.query<{ at: string }>(
      "SELECT to_char(now()-interval '1 minute','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS at",
    )
  ).rows[0]!.at;
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("nega meta de outro tenant e não aceita vínculo composto inconsistente", async () => {
  await db.exec("RESET ROLE");
  await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'QA B',true)", [
    other,
  ]);
  await db.query(
    "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
    [other, other, doctor],
  );
  await db.query(
    "INSERT INTO public.tm_journey_goals(id,clinic_id,patient_id,patient_user_id,version,policy_version_id,kind,cadence,status,effective_from) VALUES($1,$2,$1,$3,1,$1,'hydration','daily','eligible',now()-interval '1 day')",
    [other, other, doctor],
  );
  await expect(
    db.query(
      "INSERT INTO public.tm_journey_goals(clinic_id,patient_id,patient_user_id,version,policy_version_id,kind,cadence,effective_from) VALUES($1,$2,$3,1,$2,'hydration','daily',now())",
      [other, patient, user],
    ),
  ).rejects.toMatchObject({ code: "23503" });
  await as(user);
  await expect(
    db.query("SELECT public.tm_submit_journey_self_report($1,$2,$3)", [other, event, occurred]),
  ).rejects.toMatchObject({ code: "42501" });
  expect(
    (await db.query("SELECT * FROM public.tm_journey_goals WHERE clinic_id=$1", [other])).rows,
  ).toHaveLength(0);
});
it("reenvio idempotente mantém um evento e sua versão", async () => {
  await as(user);
  const first = await submit();
  const replay = await submit();
  expect(replay.rows[0]?.event.id).toBe(first.rows[0]?.event.id);
  expect((await db.query("SELECT * FROM public.tm_journey_events")).rows).toHaveLength(1);
  await expect(
    submit(event, new Date(Date.parse(occurred) - 1000).toISOString()),
  ).rejects.toMatchObject({ code: "23505" });
});
it("outra conta e Super ADM sem vínculo não leem nem enviam", async () => {
  await db.exec("RESET ROLE");
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [other],
  );
  await as(other);
  expect((await db.query("SELECT * FROM public.tm_journey_events")).rows).toHaveLength(0);
  await expect(submit()).rejects.toMatchObject({ code: "42501" });
});
it("médico verificado lê somente com grant e não cria autorrelato", async () => {
  await as(doctor);
  expect((await db.query("SELECT * FROM public.tm_journey_events")).rows).toHaveLength(1);
  await expect(submit()).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE public.tm_memberships SET medical_identity_verified=false WHERE user_id=$1",
    [doctor],
  );
  await as(doctor);
  expect((await db.query("SELECT * FROM public.tm_journey_events")).rows).toHaveLength(0);
});
it("escritas diretas e exclusão são negadas", async () => {
  await as(user);
  await expect(db.exec("DELETE FROM public.tm_journey_events")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(
    db.exec("UPDATE public.tm_journey_goals SET status='eligible'"),
  ).rejects.toMatchObject({ code: "42501" });
});
it("pausa e meta clínica sem fluxo validado não geram eventos", async () => {
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_journey_preferences SET is_enabled=false WHERE patient_id=$1", [
    patient,
  ]);
  await as(user);
  await expect(submit()).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_journey_preferences SET is_enabled=true WHERE patient_id=$1", [
    patient,
  ]);
  await db.query("UPDATE public.tm_journey_goals SET kind='medication' WHERE id=$1", [goal]);
  await as(user);
  await expect(submit()).rejects.toMatchObject({ code: "42501" });
});
it("paciente pausa com revisão auditada; conflito não sobrescreve e histórico permanece", async () => {
  await as(user);
  const change = await db.query<{ value: { revision: number; is_enabled: boolean } }>(
    "SELECT public.tm_set_journey_preference($1,false,1) AS value",
    [patient],
  );
  expect(change.rows[0]!.value).toMatchObject({ revision: 2, is_enabled: false });
  await expect(
    db.query("SELECT public.tm_set_journey_preference($1,true,1)", [patient]),
  ).rejects.toMatchObject({ code: "40001" });
  await db.query("SELECT public.tm_set_journey_preference($1,false,2)", [patient]);
  const audit = await db.query<{ actor_user_id: string; revision: number }>(
    "SELECT * FROM public.tm_journey_preference_audit",
  );
  expect(audit.rows).toHaveLength(1);
  expect(audit.rows[0]).toMatchObject({ actor_user_id: user, revision: 2 });
  expect((await db.query("SELECT * FROM public.tm_journey_events")).rows).toHaveLength(1);
  await expect(db.exec("DELETE FROM public.tm_journey_preference_audit")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(
    db.exec("UPDATE public.tm_journey_preferences SET is_enabled=true"),
  ).rejects.toMatchObject({ code: "42501" });
});
it("outra conta não altera preferência nem lê auditoria", async () => {
  await as(other);
  await expect(
    db.query("SELECT public.tm_set_journey_preference($1,true,2)", [patient]),
  ).rejects.toMatchObject({ code: "42501" });
  expect((await db.query("SELECT * FROM public.tm_journey_preference_audit")).rows).toHaveLength(0);
});
it("revogar grant impede habilitação mas permite desligar a participação", async () => {
  await as(user);
  await db.query("SELECT public.tm_set_journey_preference($1,true,2)", [patient]);
  await db.exec("RESET ROLE");
  await db.query(
    "DELETE FROM public.tm_membership_grants WHERE membership_id=$1 AND resource='journey_events' AND action='create'",
    [user],
  );
  await as(user);
  await db.query("SELECT public.tm_set_journey_preference($1,false,3)", [patient]);
  await expect(
    db.query("SELECT public.tm_set_journey_preference($1,true,4)", [patient]),
  ).rejects.toMatchObject({ code: "42501" });
  expect((await db.query("SELECT * FROM public.tm_journey_preference_audit")).rows).toHaveLength(3);
});
it("leitura inicial vem desligada sem inserir registro e nega paciente alheio", async () => {
  const newUser = "00000000-0000-4000-8000-000000000008";
  await db.exec("RESET ROLE");
  await db.query(
    "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$1,true)",
    [newUser, clinic],
  );
  await db.query(
    "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,patient_id) VALUES($1,$2,$1,'paciente',true,$1)",
    [newUser, clinic],
  );
  await as(newUser);
  const result = await db.query<{ value: { is_enabled: boolean; revision: number } }>(
    "SELECT public.tm_get_journey_preference($1) AS value",
    [newUser],
  );
  expect(result.rows[0]!.value).toMatchObject({ is_enabled: false, revision: 0 });
  expect((await db.query("SELECT * FROM public.tm_journey_preferences")).rows).toHaveLength(0);
  expect((await db.query("SELECT * FROM public.tm_journey_preference_audit")).rows).toHaveLength(0);
  await expect(
    db.query("SELECT public.tm_get_journey_preference($1)", [patient]),
  ).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_memberships SET is_active=false WHERE id=$1", [newUser]);
  await as(newUser);
  await expect(
    db.query("SELECT public.tm_get_journey_preference($1)", [newUser]),
  ).rejects.toMatchObject({ code: "42501" });
});
