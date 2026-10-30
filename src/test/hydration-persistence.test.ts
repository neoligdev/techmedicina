import { validateHydrationPage } from "@/features/hydration/list-contract";
// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, it, expect } from "vitest";
import { hydrationReceiptSchema } from "@/features/hydration/mutation-contract";
import { hydrationRecordSchema } from "@/features/hydration/contracts";
let db: PGlite;
const clinic = randomUUID(),
  otherClinic = randomUUID(),
  patient = randomUUID(),
  otherPatient = randomUUID(),
  userId = randomUUID(),
  otherUser = randomUUID(),
  admin = randomUUID(),
  member = randomUUID(),
  otherMember = randomUUID();
const id = randomUUID(),
  request = randomUUID(),
  document = { volumeMl: 250, occurredAt: "2026-10-29T12:00:00Z" };
const create = {
  kind: "create",
  recordId: id,
  sourceRequestId: request,
  expectedRevision: 0,
  document,
};
async function login(who = userId, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [who]);
  await db.exec(role === "anon" ? "SET ROLE anon" : "SET ROLE authenticated");
}
async function mutate(command: unknown, tenant = clinic) {
  return (
    await db.query<{ value: { receipt: unknown; record: unknown; replayed: boolean } }>(
      "SELECT public.tm_mutate_own_hydration_record($1,$2::jsonb) AS value",
      [tenant, JSON.stringify(command)],
    )
  ).rows[0]!.value;
}
async function get(target = id, tenant = clinic) {
  return (
    await db.query<{ value: { clinicId: string; patientId: string; record: unknown } }>(
      "SELECT public.tm_get_own_hydration_record($1,$2) AS value",
      [tenant, target],
    )
  ).rows[0]!.value;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`,
  );
  for (const file of [
    "001_tenant_foundation.sql",
    "041_own_hydration_records.sql",
    "042_own_hydration_list.sql",
  ])
    await db.exec(
      await readFile(new URL("../../database/migrations/" + file, import.meta.url), "utf8"),
    );
  for (const c of [clinic, otherClinic])
    await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'QA',true)", [c]);
  for (const [p, u, m] of [
    [patient, userId, member],
    [otherPatient, otherUser, otherMember],
  ]) {
    await db.query(
      "INSERT INTO public.tm_patients(id,clinic_id,user_id,is_active) VALUES($1,$2,$3,true)",
      [p, clinic, u],
    );
    await db.query(
      "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,patient_id,is_active) VALUES($1,$2,$3,'paciente',$4,true)",
      [m, clinic, u, p],
    );
    for (const action of ["read", "create", "write"])
      await db.query(
        "INSERT INTO public.tm_membership_grants(membership_id,resource,action) VALUES($1,'hydration_records',$2)",
        [m, action],
      );
  }
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [admin],
  );
}, 30000);
afterAll(async () => {
  await db.close();
});
it("atomically creates current record and receipt; retries never duplicate", async () => {
  await login();
  const first = await mutate(create),
    receipt = hydrationReceiptSchema.parse(first.receipt);
  expect(receipt.record).toMatchObject({
    id,
    clinicId: clinic,
    patientId: patient,
    revision: 1,
    status: "active",
    volumeMl: 250,
  });
  expect(first.replayed).toBe(false);
  expect((await mutate(create)).replayed).toBe(true);
  expect(hydrationRecordSchema.parse((await get()).record).revision).toBe(1);
});
it("corrects and voids preserving immutable receipts and rejects stale updates", async () => {
  await login();
  const corrected = {
    ...create,
    kind: "correct",
    sourceRequestId: randomUUID(),
    expectedRevision: 1,
    document: { ...document, volumeMl: 125 },
  };
  const changed = await mutate(corrected);
  expect(hydrationRecordSchema.parse(changed.record)).toMatchObject({ revision: 2, volumeMl: 125 });
  const retry = await mutate(create);
  expect(hydrationReceiptSchema.parse(retry.receipt).record.revision).toBe(1);
  expect(hydrationRecordSchema.parse(retry.record).revision).toBe(2);
  await expect(mutate({ ...corrected, sourceRequestId: randomUUID() })).rejects.toMatchObject({
    code: "40001",
  });
  await expect(
    mutate({ ...create, document: { ...document, volumeMl: 999 } }),
  ).rejects.toMatchObject({ code: "40001" });
  const voided = await mutate({
    kind: "void",
    recordId: id,
    sourceRequestId: randomUUID(),
    expectedRevision: 2,
  });
  expect(hydrationRecordSchema.parse(voided.record)).toMatchObject({
    status: "voided",
    revision: 3,
    volumeMl: 125,
  });
  await expect(
    mutate({ ...corrected, expectedRevision: 3, sourceRequestId: randomUUID() }),
  ).rejects.toMatchObject({ code: "40001" });
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM public.tm_hydration_receipts WHERE record_id=$1",
        [id],
      )
    ).rows[0]!.n,
  ).toBe(3);
});
it("prevents cross-patient writes and reads and rejects another tenant and platform operator", async () => {
  await login(otherUser);
  expect((await get()).record).toBeNull();
  await expect(mutate(create)).rejects.toMatchObject({ code: "42501" });
  await login();
  await expect(get(id, otherClinic)).rejects.toMatchObject({ code: "42501" });
  await login(admin);
  await expect(get()).rejects.toMatchObject({ code: "42501" });
  await login(userId, "anon");
  await expect(get()).rejects.toMatchObject({ code: "42501" });
});
it("revalidates read/write grants before retry and forbids direct table or helper access", async () => {
  await db.exec("RESET ROLE");
  await db.query(
    "DELETE FROM public.tm_membership_grants WHERE membership_id=$1 AND action='read'",
    [member],
  );
  await login();
  await expect(mutate(create)).rejects.toMatchObject({ code: "42501" });
  await expect(get()).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("INSERT INTO public.tm_membership_grants VALUES($1,'hydration_records','read')", [
    member,
  ]);
  await login();
  for (const sql of [
    "SELECT * FROM public.tm_hydration_records",
    "SELECT * FROM public.tm_hydration_receipts",
    "SELECT public.tm_require_own_hydration_patient('" + clinic + "','read')",
  ])
    await expect(db.query(sql)).rejects.toMatchObject({ code: "42501" });
});
it("rejects extra scope, malformed measurements and revision types without inserting", async () => {
  await login();
  for (const bad of [
    { ...create, recordId: randomUUID(), clinicId: clinic },
    { ...create, recordId: randomUUID(), expectedRevision: 0.5 },
    { ...create, recordId: randomUUID(), document: { ...document, volumeMl: -1 } },
    {
      ...create,
      recordId: randomUUID(),
      document: { ...document, occurredAt: "2026-10-29T12:00:00" },
    },
    { ...create, recordId: randomUUID(), document: { ...document, volumeMl: 9007199254740992 } },
  ])
    await expect(mutate(bad)).rejects.toThrow();
  await db.exec("RESET ROLE");
  expect(
    (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM public.tm_hydration_records"))
      .rows[0]!.n,
  ).toBe(1);
});
it("revoked patient status blocks previously authorized reads", async () => {
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_patients SET is_active=false WHERE id=$1", [patient]);
  await login();
  await expect(get()).rejects.toMatchObject({ code: "42501" });
});
it("rolls back record creation if the receipt cannot be persisted", async () => {
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_patients SET is_active=true WHERE id=$1", [patient]);
  await db.exec(
    `CREATE FUNCTION public.qa_fail_hydration_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'QA receipt failure'; END $$; CREATE TRIGGER qa_receipt_failure BEFORE INSERT ON public.tm_hydration_receipts FOR EACH ROW EXECUTE FUNCTION public.qa_fail_hydration_receipt();`,
  );
  const target = randomUUID();
  await login();
  await expect(
    mutate({ ...create, recordId: target, sourceRequestId: randomUUID() }),
  ).rejects.toThrow("QA receipt failure");
  expect((await get(target)).record).toBeNull();
  await db.exec("RESET ROLE");
  await db.exec(
    "DROP TRIGGER qa_receipt_failure ON public.tm_hydration_receipts; DROP FUNCTION public.qa_fail_hydration_receipt();",
  );
});
it("checks write permission before correction even with a valid read grant", async () => {
  await db.exec("RESET ROLE");
  await db.query(
    "DELETE FROM public.tm_membership_grants WHERE membership_id=$1 AND action='write'",
    [member],
  );
  await login();
  await expect(
    mutate({
      kind: "correct",
      recordId: id,
      sourceRequestId: randomUUID(),
      expectedRevision: 3,
      document,
    }),
  ).rejects.toMatchObject({ code: "42501" });
  expect((await get()).record).not.toBeNull();
});
it("paginates only own current snapshots in a half-open interval, including voided records", async () => {
  await login();
  const from = "2026-10-29T00:00:00Z",
    until = "2026-10-30T00:00:00Z";
  for (let i = 0; i < 3; i++)
    await mutate({
      ...create,
      recordId: randomUUID(),
      sourceRequestId: randomUUID(),
      document: { ...document, volumeMl: i },
    });
  const outside = randomUUID();
  await mutate({
    ...create,
    recordId: outside,
    sourceRequestId: randomUUID(),
    document: { ...document, occurredAt: until },
  });
  const list = async (after: string | null = null, who = clinic) =>
    (
      await db.query<{
        value: {
          clinicId: string;
          patientId: string;
          records: Array<{ id: string; status: string }>;
          nextCursor: string | null;
        };
      }>("SELECT public.tm_list_own_hydration_records($1,$2,$3,$4,2) AS value", [
        who,
        from,
        until,
        after,
      ])
    ).rows[0]!.value;
  const first = await list();
  validateHydrationPage(first, { clinicId: clinic, patientId: patient }, { from, until, limit: 2 });
  expect(first.clinicId).toBe(clinic);
  expect(first.patientId).toBe(patient);
  expect(first.records).toHaveLength(2);
  expect(first.nextCursor).toBe(first.records[1]!.id);
  const second = await list(first.nextCursor),
    all = [...first.records, ...second.records];
  expect(second.nextCursor).toBeNull();
  expect(new Set(all.map((r) => r.id)).size).toBe(4);
  expect(all.some((r) => r.id === id && r.status === "voided")).toBe(true);
  expect(all.some((r) => r.id === outside)).toBe(false);
  await expect(list(outside)).rejects.toMatchObject({ code: "22023" });
  await expect(list(null, otherClinic)).rejects.toMatchObject({ code: "42501" });
  await login(otherUser);
  const other = await list();
  expect(other.records).toEqual([]);
  await expect(list(first.nextCursor)).rejects.toMatchObject({ code: "22023" });
  await login(userId, "anon");
  await expect(list()).rejects.toMatchObject({ code: "42501" });
});
it("rejects invalid SQL intervals and page limits", async () => {
  await login();
  for (const [from, until, limit] of [
    [null, "2026-10-30T00:00:00Z", 25],
    ["2026-10-30T00:00:00Z", "2026-10-29T00:00:00Z", 25],
    ["-infinity", "infinity", 25],
    ["2026-10-29T00:00:00Z", "2026-10-30T00:00:00Z", 101],
  ])
    await expect(
      db.query("SELECT public.tm_list_own_hydration_records($1,$2,$3,NULL,$4)", [
        clinic,
        from,
        until,
        limit,
      ]),
    ).rejects.toMatchObject({ code: "22023" });
});
