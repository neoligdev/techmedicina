// @vitest-environment node
import { createHydrationReminderPlanner } from "@/lib/hydration/reminder-planner.server";
import { createHydrationReminderPlanningStore } from "@/lib/hydration/reminder-planning-store.server";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
import { hydrationReminderJobSchema } from "@/features/hydration/reminder-job-contract";
import { createHydrationReminderStore } from "@/lib/hydration/reminder-store.server";
import { createHydrationReminderWorker } from "@/lib/hydration/reminder-worker.server";
let db: PGlite;
const clinic = randomUUID(),
  patient = randomUUID(),
  user = randomUUID(),
  member = randomUUID(),
  scheduled = "2026-10-31T09:00:00Z";
const settings = {
  dailyGoalMl: null,
  timeZone: "UTC",
  remindersEnabled: true,
  reminderTimes: ["09:00"],
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;",
  );
  for (const file of [
    "001_tenant_foundation.sql",
    "041_own_hydration_records.sql",
    "045_own_hydration_preferences.sql",
    "046_private_hydration_reminder_queue.sql",
    "047_private_hydration_reminder_candidates.sql",
  ]) {
    if (file.startsWith("046"))
      await db.exec(
        "CREATE ROLE qa_default_worker NOLOGIN;ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO qa_default_worker;ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO qa_default_worker;",
      );
    await db.exec(
      await readFile(new URL("../../database/migrations/" + file, import.meta.url), "utf8"),
    );
  }
  await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'QA',true)", [clinic]);
  await db.query(
    "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
    [patient, clinic, user],
  );
  await db.query(
    "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,patient_id,is_active) VALUES($1,$2,$3,'paciente',$4,true)",
    [member, clinic, user, patient],
  );
  await db.query("INSERT INTO public.tm_membership_grants VALUES($1,'hydration_records','read')", [
    member,
  ]);
  await db.query("INSERT INTO public.tm_hydration_preferences VALUES($1,$2,$3,1,$4::jsonb)", [
    clinic,
    patient,
    user,
    JSON.stringify(settings),
  ]);
}, 30000);
beforeEach(async () => {
  await db.exec("RESET ROLE;DELETE FROM public.tm_hydration_reminder_jobs;");
  await db.query("UPDATE public.tm_hydration_preferences SET revision=1,settings=$1::jsonb", [
    JSON.stringify(settings),
  ]);
  await db.query("UPDATE public.tm_patients SET is_active=true WHERE id=$1", [patient]);
  await db.query(
    "INSERT INTO public.tm_membership_grants VALUES($1,'hydration_records','read') ON CONFLICT DO NOTHING",
    [member],
  );
});
afterAll(async () => {
  await db.close();
});
async function enqueue(
  id: string = randomUUID(),
  at = scheduled,
  p: string = patient,
  c: string = clinic,
) {
  return (
    await db.query<{ value: unknown }>(
      "SELECT public.tm_enqueue_hydration_reminder($1,$2,$3,$4) AS value",
      [id, c, p, at],
    )
  ).rows[0]!.value;
}
const store = () =>
  createHydrationReminderStore(async (name, args) => {
    if (name === "tm_get_hydration_reminder_job")
      return (
        await db.query<{ value: unknown }>(
          "SELECT public.tm_get_hydration_reminder_job($1) AS value",
          [args["p_id"]],
        )
      ).rows[0]!.value;
    if (name === "tm_claim_hydration_reminder")
      return (
        await db.query<{ value: unknown }>(
          "SELECT public.tm_claim_hydration_reminder($1,$2,$3) AS value",
          [args["p_id"], args["p_expected_revision"], args["p_attempt_id"]],
        )
      ).rows[0]!.value;
    return (
      await db.query<{ value: unknown }>(
        "SELECT public.tm_transition_hydration_reminder($1,$2,$3,$4,$5,$6) AS value",
        [
          args["p_id"],
          args["p_expected_revision"],
          args["p_attempt_id"],
          args["p_status"],
          args["p_reason"] ?? null,
          args["p_provider_receipt_id"] ?? null,
        ],
      )
    ).rows[0]!.value;
  });
it("creates one durable civil occurrence despite different job IDs or preference revisions", async () => {
  const first = hydrationReminderJobSchema.parse(await enqueue());
  await db.query("UPDATE public.tm_hydration_preferences SET revision=2");
  const again = hydrationReminderJobSchema.parse(await enqueue());
  expect(again.id).toBe(first.id);
  expect(again.preferencesRevision).toBe(1);
  expect(again.slotKey).toBe(first.slotKey);
  expect(
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM public.tm_hydration_reminder_jobs",
      )
    ).rows[0]!.n,
  ).toBe(1);
});
it("deduplicates repeated DST hour and rejects unconfigured or unaligned slots", async () => {
  await db.query("UPDATE public.tm_hydration_preferences SET settings=$1::jsonb", [
    JSON.stringify({ ...settings, timeZone: "America/Sao_Paulo", reminderTimes: ["23:30"] }),
  ]);
  const a = hydrationReminderJobSchema.parse(await enqueue(randomUUID(), "2019-02-17T01:30:00Z"));
  const b = hydrationReminderJobSchema.parse(await enqueue(randomUUID(), "2019-02-17T02:30:00Z"));
  expect(a.id).toBe(b.id);
  await expect(enqueue(randomUUID(), "2019-02-17T02:31:00Z")).rejects.toMatchObject({
    code: "22023",
  });
  await expect(enqueue(randomUUID(), "2019-02-17T02:30:01Z")).rejects.toMatchObject({
    code: "22023",
  });
});
it("atomically grants one claim and enforces attempt/revision fences and terminal state", async () => {
  const job = hydrationReminderJobSchema.parse(await enqueue()),
    s = store();
  const [a, b] = await Promise.all([s.claim(job, randomUUID()), s.claim(job, randomUUID())]);
  expect([a, b].filter(Boolean)).toHaveLength(1);
  const claimed = hydrationReminderJobSchema.parse(a ?? b);
  expect(
    await s.transition(
      { ...claimed, attemptId: randomUUID() },
      { status: "dispatching", reason: null, providerReceiptId: null },
    ),
  ).toBeNull();
  const dispatch = hydrationReminderJobSchema.parse(
    await s.transition(claimed, { status: "dispatching", reason: null, providerReceiptId: null }),
  );
  const accepted = hydrationReminderJobSchema.parse(
    await s.transition(dispatch, { status: "accepted", reason: null, providerReceiptId: "opaque" }),
  );
  expect(accepted.revision).toBe(4);
  expect(
    await s.transition(dispatch, {
      status: "uncertain",
      reason: "provider_uncertain",
      providerReceiptId: null,
    }),
  ).toBeNull();
  expect(hydrationReminderJobSchema.parse(await s.read(job.id)).status).toBe("accepted");
});
it("refuses skipped states, false delivery and acceptance without receipt", async () => {
  const job = hydrationReminderJobSchema.parse(await enqueue()),
    s = store(),
    claimed = hydrationReminderJobSchema.parse(await s.claim(job, randomUUID()));
  expect(
    await s.transition(claimed, { status: "accepted", reason: null, providerReceiptId: "opaque" }),
  ).toBeNull();
  await expect(
    db.query("SELECT public.tm_transition_hydration_reminder($1,2,$2,'delivered',NULL,'fake')", [
      job.id,
      claimed.attemptId,
    ]),
  ).rejects.toMatchObject({ code: "22023" });
  const dispatch = hydrationReminderJobSchema.parse(
    await s.transition(claimed, { status: "dispatching", reason: null, providerReceiptId: null }),
  );
  await expect(
    s.transition(dispatch, { status: "accepted", reason: null, providerReceiptId: null }),
  ).rejects.toMatchObject({ code: "22023" });
  await expect(
    db.query(
      "UPDATE public.tm_hydration_reminder_jobs SET status='accepted',revision=4,reason=NULL,provider_receipt_id=NULL WHERE id=$1",
      [job.id],
    ),
  ).rejects.toMatchObject({ code: "23514" });
});
it("keeps provider uncertainty persisted across fresh worker instances", async () => {
  const job = hydrationReminderJobSchema.parse(await enqueue()),
    send = vi.fn(async () => {
      throw new Error("response lost");
    });
  const providers = {
    ...store(),
    authorize: async () => ({
      preferences: { clinicId: clinic, patientId: patient, revision: 1, settings },
      registration: {
        id: randomUUID(),
        clinicId: clinic,
        patientId: patient,
        active: true,
        consentGranted: true,
      },
    }),
    send,
    now: () => "2026-10-31T09:00:10Z",
  };
  expect(await createHydrationReminderWorker(providers)(job.id)).toEqual({ outcome: "uncertain" });
  expect(await createHydrationReminderWorker({ ...providers, ...store() })(job.id)).toEqual({
    outcome: "already_claimed_or_finished",
  });
  expect(send).toHaveBeenCalledTimes(1);
  expect(hydrationReminderJobSchema.parse(await store().read(job.id)).reason).toBe(
    "provider_uncertain",
  );
});
it("persists expired outcome without provider calls and bounds due listing", async () => {
  const job = hydrationReminderJobSchema.parse(await enqueue());
  const send = vi.fn();
  const due = await db.query<{ id: string }>(
    "SELECT public.tm_list_due_hydration_reminders($1,25) AS id",
    ["2026-10-31T09:02:00Z"],
  );
  expect(due.rows.map((v) => v.id)).toEqual([job.id]);
  const worker = createHydrationReminderWorker({
    ...store(),
    authorize: async () => null,
    send,
    now: () => "2026-10-31T09:02:00Z",
  });
  expect(await worker(job.id)).toEqual({ outcome: "expired" });
  expect(send).not.toHaveBeenCalled();
  await expect(
    db.query("SELECT public.tm_list_due_hydration_reminders(now(),101)"),
  ).rejects.toMatchObject({ code: "22023" });
});
it("refuses enqueue without active patient, own read grant or enabled preference", async () => {
  await expect(enqueue(randomUUID(), scheduled, randomUUID())).rejects.toMatchObject({
    code: "42501",
  });
  await db.query("UPDATE public.tm_patients SET is_active=false WHERE id=$1", [patient]);
  await expect(enqueue()).rejects.toMatchObject({ code: "42501" });
  await db.query("UPDATE public.tm_patients SET is_active=true WHERE id=$1", [patient]);
  await db.query("DELETE FROM public.tm_membership_grants WHERE membership_id=$1", [member]);
  await expect(enqueue()).rejects.toMatchObject({ code: "42501" });
  await db.query("INSERT INTO public.tm_membership_grants VALUES($1,'hydration_records','read')", [
    member,
  ]);
  await db.query(
    "UPDATE public.tm_hydration_preferences SET settings=jsonb_set(settings,'{remindersEnabled}','false')",
  );
  await expect(enqueue()).rejects.toMatchObject({ code: "42501" });
});
it("exposes neither queue nor any worker function to anonymous or authenticated application roles", async () => {
  const job = hydrationReminderJobSchema.parse(await enqueue());
  for (const role of ["anon", "authenticated", "qa_default_worker"]) {
    await db.exec("SET ROLE " + role);
    await expect(db.query("SELECT * FROM public.tm_hydration_reminder_jobs")).rejects.toMatchObject(
      { code: "42501" },
    );
    await expect(
      db.query("SELECT public.tm_get_hydration_reminder_job($1)", [job.id]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("SELECT public.tm_claim_hydration_reminder($1,1,$2)", [job.id, randomUUID()]),
    ).rejects.toMatchObject({ code: "42501" });
    await db.exec("RESET ROLE");
  }
  const functions = await db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('tm_hydration_reminder_job_json','tm_enqueue_hydration_reminder','tm_get_hydration_reminder_job','tm_list_due_hydration_reminders','tm_claim_hydration_reminder','tm_transition_hydration_reminder') AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') OR has_function_privilege('qa_default_worker',p.oid,'EXECUTE'))",
  );
  expect(functions.rows[0]!.n).toBe(0);
});
it("preserves default privileges for other objects while stripping them from the private queue", async () => {
  await db.exec(
    "CREATE TABLE public.qa_acl_probe(id integer);CREATE FUNCTION public.qa_acl_probe_function() RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$;",
  );
  const probe = await db.query<{ allowed: boolean }>(
    "SELECT has_table_privilege('qa_default_worker','public.qa_acl_probe','SELECT') AS allowed",
  );
  expect(probe.rows[0]!.allowed).toBe(true);
  const queue = await db.query<{ allowed: boolean }>(
    "SELECT has_table_privilege('qa_default_worker','public.tm_hydration_reminder_jobs','SELECT') AS allowed",
  );
  expect(queue.rows[0]!.allowed).toBe(false);
  const job = hydrationReminderJobSchema.parse(await enqueue());
  await expect(enqueue(job.id, "2026-11-01T09:00:00Z")).rejects.toMatchObject({ code: "23505" });
  expect(await store().read(randomUUID())).toBeNull();
});

const planningStore = () =>
  createHydrationReminderPlanningStore(async (name, args) => {
    if (name === "tm_enqueue_hydration_reminder")
      return enqueue(
        args["p_id"] as string,
        args["p_scheduled_at"] as string,
        args["p_patient_id"] as string,
        args["p_clinic_id"] as string,
      );
    return (
      await db.query<{ value: unknown }>(
        "SELECT public.tm_list_hydration_reminder_candidates($1,$2) AS value",
        [args["p_after"] ?? null, args["p_limit"]],
      )
    ).rows[0]!.value;
  });
it("plans from the private SQL candidate source and retries an uncertain committed enqueue without duplication", async () => {
  const store = planningStore();
  let loseResponse = true;
  const planner = createHydrationReminderPlanner({
    ...store,
    now: () => scheduled,
    newJobId: randomUUID,
    enqueue: async (request) => {
      const result = await store.enqueue(request);
      if (loseResponse) {
        loseResponse = false;
        throw new Error("lost committed response");
      }
      return result;
    },
  });
  await expect(planner()).rejects.toThrow("lost committed response");
  expect(await planner()).toEqual({ scanned: 1, planned: 1, next: null });
  expect(
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM public.tm_hydration_reminder_jobs",
      )
    ).rows[0]!.n,
  ).toBe(1);
});
it("lists no candidate after disabling preferences, revoking read or deactivating the patient", async () => {
  const store = planningStore();
  await db.query(
    "UPDATE public.tm_hydration_preferences SET settings=jsonb_set(settings,'{remindersEnabled}','false')",
  );
  expect(await store.list({ after: null, limit: 100 })).toEqual({ items: [], nextCursor: null });
  await db.query("UPDATE public.tm_hydration_preferences SET settings=$1::jsonb", [
    JSON.stringify(settings),
  ]);
  await db.query("DELETE FROM public.tm_membership_grants WHERE membership_id=$1", [member]);
  expect(await store.list({ after: null, limit: 100 })).toEqual({ items: [], nextCursor: null });
  await db.query("INSERT INTO public.tm_membership_grants VALUES($1,'hydration_records','read')", [
    member,
  ]);
  await db.query("UPDATE public.tm_patients SET is_active=false WHERE id=$1", [patient]);
  expect(await store.list({ after: null, limit: 100 })).toEqual({ items: [], nextCursor: null });
});
it("fails closed when authorization changes between listing and enqueue", async () => {
  const store = planningStore();
  const planner = createHydrationReminderPlanner({
    ...store,
    now: () => scheduled,
    newJobId: randomUUID,
    list: async (request) => {
      const page = await store.list(request);
      await db.query("DELETE FROM public.tm_membership_grants WHERE membership_id=$1", [member]);
      return page;
    },
  });
  await expect(planner()).rejects.toMatchObject({ code: "42501" });
  expect(
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM public.tm_hydration_reminder_jobs",
      )
    ).rows[0]!.n,
  ).toBe(0);
});
it("keeps the bulk candidate function private even with inherited default grants", async () => {
  for (const role of ["anon", "authenticated", "qa_default_worker"]) {
    await db.exec(`SET ROLE ${role}`);
    await expect(
      db.query("SELECT public.tm_list_hydration_reminder_candidates()"),
    ).rejects.toMatchObject({ code: "42501" });
    await db.exec("RESET ROLE");
  }
  await expect(
    db.query("SELECT public.tm_list_hydration_reminder_candidates(NULL,101)"),
  ).rejects.toMatchObject({ code: "22023" });
  await expect(
    db.query("SELECT public.tm_list_hydration_reminder_candidates('not-a-cursor',1)"),
  ).rejects.toMatchObject({ code: "22023" });
  expect(await planningStore().list({ after: `${clinic}:${patient}`, limit: 1 })).toEqual({
    items: [],
    nextCursor: null,
  });
});
it("paginates across 102 eligible patients without duplicates or skipped boundaries", async () => {
  await db.exec("BEGIN");
  try {
    const secondClinic = randomUUID();
    await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'Other QA',true)", [
      secondClinic,
    ]);
    for (let i = 0; i < 101; i++) {
      const p = randomUUID(),
        u = randomUUID(),
        m = randomUUID(),
        c = i % 2 ? clinic : secondClinic;
      await db.query(
        "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
        [p, c, u],
      );
      await db.query(
        "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,patient_id,is_active) VALUES($1,$2,$3,'paciente',$4,true)",
        [m, c, u, p],
      );
      await db.query(
        "INSERT INTO public.tm_membership_grants VALUES($1,'hydration_records','read')",
        [m],
      );
      await db.query("INSERT INTO public.tm_hydration_preferences VALUES($1,$2,$3,1,$4::jsonb)", [
        c,
        p,
        u,
        JSON.stringify(settings),
      ]);
    }
    const planner = createHydrationReminderPlanner({
      ...planningStore(),
      now: () => scheduled,
      newJobId: randomUUID,
    });
    const first = await planner();
    expect(first.scanned).toBe(100);
    expect(first.planned).toBe(100);
    expect(first.next).not.toBeNull();
    expect(await planner(first.next)).toEqual({ scanned: 2, planned: 2, next: null });
    expect(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::int AS n FROM public.tm_hydration_reminder_jobs",
        )
      ).rows[0]!.n,
    ).toBe(102);
    // Explicitly replaying the first batch still creates no extra occurrences.
    await planner();
    expect(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::int AS n FROM public.tm_hydration_reminder_jobs",
        )
      ).rows[0]!.n,
    ).toBe(102);
  } finally {
    await db.exec("ROLLBACK");
  }
});
