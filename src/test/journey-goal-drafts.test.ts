// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createJourneyGoalDraftClient } from "@/features/journey/goal-draft-client";
import { createJourneyEndpoints } from "@/lib/journey/endpoints.server";
import { createJourneyRpcRepository } from "@/lib/journey/rpc-repository.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
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
    "013_journey_goal_drafts.sql",
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
    "INSERT INTO public.tm_membership_grants VALUES($1,'journey_goals','create'),($1,'journey_goals','write'),($1,'journey_goals','read'),($2,'journey_goals','read'),($2,'journey_events','create')",
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

afterAll(async () => {
  await db?.close();
});
it("grant write sem create não permite rascunho ou replay", async () => {
  await db.exec("RESET ROLE");
  await db.query(
    "DELETE FROM public.tm_membership_grants WHERE membership_id=$1 AND resource='journey_goals' AND action='create'",
    [doctor],
  );
  await as(doctor);
  await expect(draft()).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("INSERT INTO public.tm_membership_grants VALUES($1,'journey_goals','create')", [
    doctor,
  ]);
});
async function draft(kind = "hydration", patientId = patient) {
  return db.query<{ value: { id: string; state: string; actor_user_id: string } }>(
    "SELECT public.tm_create_journey_goal_draft($1,$2,$3,$4,$5) AS value",
    [clinic, patientId, goal, kind, "weekly"],
  );
}
it("médico cria rascunho auditado idempotente sem modificar meta vigente", async () => {
  await as(doctor);
  const first = await draft(),
    replay = await draft();
  expect(replay.rows).toEqual(first.rows);
  expect(first.rows[0]!.value).toMatchObject({ state: "draft", actor_user_id: doctor });
  expect((await db.query("SELECT * FROM public.tm_journey_goal_drafts")).rows).toHaveLength(1);
  expect(
    (await db.query("SELECT status,version FROM public.tm_journey_goals WHERE id=$1", [goal])).rows,
  ).toEqual([{ status: "eligible", version: 1 }]);
  await expect(draft("sleep")).rejects.toMatchObject({ code: "23505" });
  await expect(
    db.exec("UPDATE public.tm_journey_goal_drafts SET state='draft'"),
  ).rejects.toMatchObject({ code: "42501" });
});
it("paciente e Super ADM não criam nem leem rascunhos médicos", async () => {
  for (const uid of [patient, other]) {
    await as(uid);
    await expect(draft()).rejects.toMatchObject({ code: "42501" });
    expect((await db.query("SELECT * FROM public.tm_journey_goal_drafts")).rows).toHaveLength(0);
  }
});
it("meta de medicação e paciente de outra clínica são recusados", async () => {
  await as(doctor);
  await expect(draft("medication")).rejects.toMatchObject({ code: "22023" });
  await expect(draft("hydration", other)).rejects.toMatchObject({ code: "42501" });
});
it("cliente, host, sessão, HTTP e SQL reconciliam resposta perdida sem duplicar", async () => {
  const identity: AuthenticatedIdentity = {
    userId: doctor,
    links: [
      {
        clinicId: clinic,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: [
          { resource: "journey_goals", action: "read" },
          { resource: "journey_goals", action: "create" },
        ],
      },
    ],
  };
  const repository = createJourneyRpcRepository(async (name, args) => {
    if (name !== "tm_create_journey_goal_draft") throw new Error("Unexpected RPC");
    await as(doctor);
    try {
      const result = await db.query<{ value: unknown }>(
        "SELECT public.tm_create_journey_goal_draft($1,$2,$3,$4,$5) AS value",
        [
          args["p_clinic_id"],
          args["p_patient_id"],
          args["p_source_request_id"],
          args["p_kind"],
          args["p_cadence"],
        ],
      );
      return { data: result.rows[0]?.value, error: null };
    } catch (error) {
      return { data: null, error: { code: (error as { code: string }).code } };
    }
  });
  const endpoints = createJourneyEndpoints({
    lookup: async (hostname) => ({
      hostname,
      clinicId: clinic,
      environment: "clinic_portal",
      status: "active",
    }),
    resolveSession: async (req) =>
      req.headers.get("authorization") === "Bearer qa" ? { identity } : null,
    preferenceRpc: () => repository.preferenceRpc,
    goalRepository: () => repository.repository,
    selfReportRpc: () => repository.selfReportRpc,
    goalDraftRpc: () => repository.goalDraftRpc,
  });
  let loseResponse = true;
  const client = createJourneyGoalDraftClient(
    { clinicId: clinic, patientId: patient, getAccessToken: async () => "qa" },
    async (url, options) => {
      const response = await endpoints.drafts(
        new Request(`https://clinic.example.com${String(url)}`, {
          ...options,
          headers: { ...options?.headers, host: "clinic.example.com" },
        }),
      );
      if (loseResponse) {
        loseResponse = false;
        throw new Error("Response lost after commit");
      }
      return response;
    },
  );
  const input = { patientId: patient, sourceRequestId: other, kind: "sleep", cadence: "daily" };
  await expect(client(input)).rejects.toThrow("Response lost after commit");
  const receipt = await client(input);
  expect(receipt).toMatchObject({
    clinicId: clinic,
    patientId: patient,
    sourceRequestId: other,
    state: "draft",
  });
  expect(
    (
      await db.query("SELECT id FROM public.tm_journey_goal_drafts WHERE source_request_id=$1", [
        other,
      ])
    ).rows,
  ).toEqual([{ id: receipt.id }]);
  await db.exec("RESET ROLE");
  await db.query(
    "DELETE FROM public.tm_membership_grants WHERE membership_id=$1 AND resource='journey_goals' AND action='create'",
    [doctor],
  );
  await expect(client(input)).rejects.toThrow("Draft unavailable");
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query("SELECT id FROM public.tm_journey_goal_drafts WHERE source_request_id=$1", [
        other,
      ])
    ).rows,
  ).toEqual([{ id: receipt.id }]);
});
