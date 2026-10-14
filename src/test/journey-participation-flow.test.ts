// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { createJourneyParticipationClient } from "../features/journey/participation-client";
import { JourneyParticipationConflict } from "../features/journey/participation";
import {
  createJourneyPreferenceHandlers,
  type JourneyPreferenceRpc,
} from "../lib/journey/preference-handlers.server";
import { AuthError } from "../lib/auth/guards.server";
import type { AuthContext } from "../lib/auth/core";
const clinicId = "00000000-0000-4000-8000-000000000001",
  patientId = "00000000-0000-4000-8000-000000000002",
  user = "00000000-0000-4000-8000-000000000003";
let db: PGlite;
const context: AuthContext = {
  currentClinicId: clinicId,
  identity: {
    userId: user,
    links: [
      {
        clinicId,
        patientId,
        role: "paciente",
        isActive: true,
        grants: [{ resource: "journey_events", action: "create" }],
      },
    ],
  },
};
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
  await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'QA local',true)", [
    clinicId,
  ]);
  await db.query(
    "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
    [patientId, clinicId, user],
  );
  await db.query(
    "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,patient_id) VALUES($1,$2,$1,'paciente',true,$3)",
    [user, clinicId, patientId],
  );
  await db.query("INSERT INTO public.tm_membership_grants VALUES($1,'journey_events','create')", [
    user,
  ]);
}, 30000);
beforeEach(async () => {
  await db.exec(
    "RESET ROLE; DELETE FROM public.tm_journey_preference_audit; DELETE FROM public.tm_journey_preferences;",
  );
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("SET ROLE authenticated");
});
afterAll(async () => {
  await db?.close();
});
const rpc: JourneyPreferenceRpc = async (name, args) => {
  try {
    const result =
      name === "tm_get_journey_preference"
        ? await db.query<{ value: unknown }>(
            "SELECT public.tm_get_journey_preference($1) AS value",
            [args.p_patient_id],
          )
        : await db.query<{ value: unknown }>(
            "SELECT public.tm_set_journey_preference($1,$2,$3) AS value",
            [args.p_patient_id, args.p_is_enabled, args.p_expected_revision],
          );
    return result.rows[0]!.value;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "40001") throw new AuthError("Conflict", 409);
    if (code === "42501") throw new AuthError("Denied", 403);
    throw error;
  }
};
const handlers = createJourneyPreferenceHandlers(async (request) =>
  request.headers.get("authorization") === "Bearer local-test-session" ? { context, rpc } : null,
);
const localFetch: typeof fetch = async (input, init) => {
  const request = new Request(new URL(String(input), "https://app.qa.test"), init);
  return request.method === "GET" ? handlers.GET(request) : handlers.PUT(request);
};
function client(patient = patientId) {
  return createJourneyParticipationClient(
    { clinicId, patientId: patient, getAccessToken: async () => "local-test-session" },
    localFetch,
  );
}
it("cliente → HTTP → RPC → SQL salva, recarrega e pausa com auditoria", async () => {
  const api = client();
  expect(await api.read()).toMatchObject({ isEnabled: false, revision: 0 });
  expect(await api.save({ patientId, isEnabled: true, expectedRevision: 0 })).toMatchObject({
    isEnabled: true,
    revision: 1,
  });
  expect(await client().read()).toMatchObject({ isEnabled: true, revision: 1 });
  expect(await api.save({ patientId, isEnabled: false, expectedRevision: 1 })).toMatchObject({
    isEnabled: false,
    revision: 2,
  });
  const audit = await db.query<{ actor_user_id: string; revision: number }>(
    "SELECT * FROM public.tm_journey_preference_audit ORDER BY revision",
  );
  expect(audit.rows.map((row) => row.revision)).toEqual([1, 2]);
  expect(audit.rows.every((row) => row.actor_user_id === user)).toBe(true);
});
it("estado antigo conflita e escopo de outro paciente não recebe confirmação", async () => {
  await client().save({ patientId, isEnabled: true, expectedRevision: 0 });
  await expect(
    client().save({ patientId, isEnabled: false, expectedRevision: 0 }),
  ).rejects.toBeInstanceOf(JourneyParticipationConflict);
  expect(await client().read()).toMatchObject({ isEnabled: true, revision: 1 });
  await expect(client(user).read()).rejects.toThrow();
  await expect(
    client(user).save({ patientId: user, isEnabled: false, expectedRevision: 1 }),
  ).rejects.toThrow();
  expect((await db.query("SELECT * FROM public.tm_journey_preference_audit")).rows).toHaveLength(1);
});
