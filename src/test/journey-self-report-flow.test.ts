// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, it, expect } from "vitest";
import { createJourneyEndpoints } from "../lib/journey/endpoints.server";
import { createJourneyRpcRepository } from "../lib/journey/rpc-repository.server";
import { createJourneySelfReportClient } from "../features/journey/self-report-client";
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

const identity = {
  userId: user,
  links: [
    {
      clinicId: clinic,
      patientId: patient,
      role: "paciente" as const,
      isActive: true,
      grants: [{ resource: "journey_events" as const, action: "create" as const }],
    },
  ],
};
const adapter = createJourneyRpcRepository(async (name, args) => {
  if (name !== "tm_submit_journey_self_report_for_clinic") throw new Error("Unexpected RPC");
  try {
    const result = await db.query<{ value: unknown }>(
      "SELECT public.tm_submit_journey_self_report_for_clinic($1,$2,$3,$4) AS value",
      [args["p_clinic_id"], args["p_goal_id"], args["p_source_event_id"], args["p_occurred_at"]],
    );
    return { data: result.rows[0]!.value, error: null };
  } catch (error) {
    return { data: null, error: { code: String((error as { code?: string }).code) } };
  }
});
const endpoints = createJourneyEndpoints({
  lookup: async (hostname) => ({
    hostname,
    clinicId: clinic,
    environment: "patient_pwa",
    status: "active",
  }),
  resolveSession: async (request) =>
    request.headers.get("authorization") === "Bearer local-test-session" ? { identity } : null,
  selfReportRpc: () => adapter.selfReportRpc,
  preferenceRpc: () => adapter.preferenceRpc,
  goalRepository: () => adapter.repository,
});
it("cliente → host/sessão → HTTP → RPC → SQL: resposta perdida mantém um evento", async () => {
  await as(user);
  let lost = true;
  const fetcher: typeof fetch = async (input, init) => {
    const req = new Request(new URL(String(input), "https://app.example.com"), {
      ...init,
      headers: { ...init?.headers, host: "app.example.com" },
    });
    const response = await endpoints.selfReport(req);
    expect(response.status).toBe(200);
    if (lost) {
      lost = false;
      throw new Error("Response lost after commit");
    }
    return response;
  };
  const send = createJourneySelfReportClient(
    { clinicId: clinic, patientId: patient, getAccessToken: async () => "local-test-session" },
    fetcher,
  );
  const input = { goalId: goal, sourceEventId: event, occurredAt: occurred };
  await expect(send(input)).rejects.toThrow("Response lost");
  const receipt = await send(input);
  expect(receipt).toMatchObject({
    clinicId: clinic,
    patientId: patient,
    goalId: goal,
    sourceEventId: event,
  });
  expect((await db.query("SELECT * FROM public.tm_journey_events")).rows).toHaveLength(1);
});
