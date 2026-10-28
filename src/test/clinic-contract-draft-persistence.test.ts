// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, it, expect } from "vitest";
import {
  emptyClinicContract,
  savedClinicContractSchema,
  clinicContractDocumentSchema,
} from "@/features/clinic-contracts/contracts";
let db: PGlite;
const operator = randomUUID(),
  other = randomUUID(),
  clinic = randomUUID(),
  foreign = randomUUID();
const document = emptyClinicContract();
async function user(id: string, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(role === "anon" ? "SET ROLE anon" : "SET ROLE authenticated");
}
async function save(id: string, revision: number, doc: unknown = document, clinicId = clinic) {
  return (
    await db.query<{ value: unknown }>(
      "SELECT public.tm_save_clinic_contract_draft($1,$2,$3,$4::jsonb) AS value",
      [id, clinicId, revision, JSON.stringify(doc)],
    )
  ).rows[0]!.value;
}
async function get(id: string, clinicId = clinic) {
  return (
    await db.query<{ value: unknown }>(
      "SELECT public.tm_get_clinic_contract_draft($1,$2) AS value",
      [id, clinicId],
    )
  ).rows[0]!.value;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`,
  );
  for (const name of ["001_tenant_foundation.sql", "034_clinic_use_contract_drafts.sql"])
    await db.exec(
      await readFile(new URL("../../database/migrations/" + name, import.meta.url), "utf8"),
    );
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [operator],
  );
  await db.query("INSERT INTO public.tm_clinics(id,name) VALUES($1,'Clínica QA'),($2,'Outra QA')", [
    clinic,
    foreign,
  ]);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("keeps undecided values distinct from zero and creates immutable revision snapshots without activation", async () => {
  await user(operator);
  const id = randomUUID();
  expect(await get(id)).toBeNull();
  const initial = savedClinicContractSchema.parse(await save(id, 0));
  expect(initial).toMatchObject({ id, clinicId: clinic, status: "draft", revision: 1, document });
  expect(initial.document.setupCents).toBeNull();
  expect(await save(id, 0)).toEqual(initial);
  const changed = {
    ...document,
    setupCents: 0,
    monthlyEnabled: true,
    monthlyCents: 12590,
    livesEnabled: null,
  };
  const updated = savedClinicContractSchema.parse(await save(id, 1, changed));
  expect(updated.revision).toBe(2);
  expect(await save(id, 2, changed)).toEqual(updated);
  expect(await get(id)).toEqual(updated);
  await expect(save(id, 1, document)).rejects.toMatchObject({ code: "40001" });
  await db.exec("RESET ROLE");
  const rows = (
    await db.query<{ document: unknown }>(
      "SELECT document FROM public.tm_clinic_contract_draft_versions WHERE draft_id=$1 ORDER BY revision",
      [id],
    )
  ).rows;
  expect(rows.map((r) => r.document)).toEqual([document, changed]);
  expect(
    (
      await db.query<{ is_active: boolean }>(
        "SELECT is_active FROM public.tm_clinics WHERE id=$1",
        [clinic],
      )
    ).rows[0]!.is_active,
  ).toBe(false);
});
it("cannot move or read a draft through another clinic or access tables directly", async () => {
  await user(operator);
  const id = randomUUID();
  await save(id, 0);
  expect(await get(id, foreign)).toBeNull();
  await expect(save(id, 1, document, foreign)).rejects.toMatchObject({ code: "42501" });
  expect(savedClinicContractSchema.parse(await get(id)).clinicId).toBe(clinic);
  await expect(db.query("SELECT * FROM public.tm_clinic_contract_drafts")).rejects.toMatchObject({
    code: "42501",
  });
  await expect(
    db.query("UPDATE public.tm_clinic_contract_draft_versions SET revision=99"),
  ).rejects.toMatchObject({ code: "42501" });
});
it("SQL independently rejects fractional cents, negatives, missing/extra fields and invalid flags", async () => {
  await user(operator);
  for (const bad of [
    { ...document, setupCents: -1 },
    { ...document, monthlyCents: 1.25 },
    { ...document, holderCents: 1000000000000 },
    { ...document, livesCount: 2147483648 },
    { ...document, livesEnabled: "true" },
    { ...document, currency: null },
    { ...document, status: "active" },
    { ...document, accepted: true },
    { ...document, notes: "x".repeat(4001) },
    { ...document, title: "  " },
    { title: "Incomplete" },
  ])
    await expect(save(randomUUID(), 0, bad)).rejects.toMatchObject({ code: "22023" });
  await expect(save(randomUUID(), 0, document, randomUUID())).rejects.toMatchObject({
    code: "22023",
  });
  await expect(save(randomUUID(), 1)).rejects.toMatchObject({ code: "40001" });
});
it("denies anonymous, ordinary accounts and revoked operators on each RPC", async () => {
  await user(operator);
  const id = randomUUID();
  await save(id, 0);
  await user(other);
  await expect(get(id)).rejects.toMatchObject({ code: "42501" });
  await expect(save(id, 1)).rejects.toMatchObject({ code: "42501" });
  await user(operator, "anon");
  await expect(get(id)).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_platform_operators SET is_active=false WHERE user_id=$1", [
    operator,
  ]);
  await user(operator);
  await expect(get(id)).rejects.toMatchObject({ code: "42501" });
  await expect(save(id, 1)).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_platform_operators SET is_active=true WHERE user_id=$1", [
    operator,
  ]);
});
it("contract validator permits incomplete drafts but no billing or entitlements flags", () => {
  expect(
    clinicContractDocumentSchema.parse({ ...document, monthlyEnabled: true, monthlyCents: null })
      .monthlyCents,
  ).toBeNull();
  expect(clinicContractDocumentSchema.safeParse({ ...document, setupCents: 0.1 }).success).toBe(
    false,
  );
  expect(clinicContractDocumentSchema.safeParse({ ...document, activate: true }).success).toBe(
    false,
  );
});
