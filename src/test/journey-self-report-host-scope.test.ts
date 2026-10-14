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
    "012_journey_self_report_host_scope.sql",
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

it("mesma conta em duas clínicas não grava meta B pelo contexto A", async () => {
  await db.exec("RESET ROLE");
  await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'QA B',true)", [
    other,
  ]);
  await db.query(
    "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$1,$2,true)",
    [other, user],
  );
  await db.query(
    "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,patient_id) VALUES($1,$1,$2,'paciente',true,$1)",
    [other, user],
  );
  await db.query(
    "INSERT INTO public.tm_membership_grants VALUES($1,'journey_events','create'),($1,'journey_events','read')",
    [other],
  );
  await db.query(
    "INSERT INTO public.tm_journey_goals(id,clinic_id,patient_id,patient_user_id,version,policy_version_id,kind,cadence,status,effective_from) VALUES($1,$1,$1,$2,1,$1,'hydration','daily','eligible',now()-interval '1 day')",
    [other, user],
  );
  await db.query(
    "INSERT INTO public.tm_journey_preferences(clinic_id,patient_id,patient_user_id,is_enabled) VALUES($1,$1,$2,true)",
    [other, user],
  );
  await as(user);
  await expect(
    db.query("SELECT public.tm_submit_journey_self_report_for_clinic($1,$2,$3,$4)", [
      clinic,
      other,
      event,
      occurred,
    ]),
  ).rejects.toMatchObject({ code: "42501" });
  expect((await db.query("SELECT * FROM public.tm_journey_events")).rows).toHaveLength(0);
  await expect(
    db.query("SELECT public.tm_submit_journey_self_report($1,$2,$3)", [other, event, occurred]),
  ).rejects.toMatchObject({ code: "42501" });
  const first = await db.query(
    "SELECT public.tm_submit_journey_self_report_for_clinic($1,$2,$3,$4) AS event",
    [other, other, event, occurred],
  );
  const replay = await db.query(
    "SELECT public.tm_submit_journey_self_report_for_clinic($1,$2,$3,$4) AS event",
    [other, other, event, occurred],
  );
  expect(replay.rows).toEqual(first.rows);
  expect((await db.query("SELECT * FROM public.tm_journey_events")).rows).toHaveLength(1);
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_journey_preferences SET is_enabled=false WHERE clinic_id=$1", [
    other,
  ]);
  await as(user);
  await expect(
    db.query("SELECT public.tm_submit_journey_self_report_for_clinic($1,$2,$3,$4)", [
      other,
      other,
      event,
      occurred,
    ]),
  ).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_journey_preferences SET is_enabled=true WHERE clinic_id=$1", [
    other,
  ]);
  await db.query("UPDATE public.tm_journey_goals SET status='paused' WHERE id=$1", [other]);
  await as(user);
  await expect(
    db.query("SELECT public.tm_submit_journey_self_report_for_clinic($1,$2,$3,$4)", [
      other,
      other,
      event,
      occurred,
    ]),
  ).rejects.toMatchObject({ code: "42501" });
  expect((await db.query("SELECT * FROM public.tm_journey_events")).rows).toHaveLength(1);
});
