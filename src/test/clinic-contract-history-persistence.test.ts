// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, it, expect } from "vitest";
import { emptyClinicContract } from "@/features/clinic-contracts/contracts";
import {
  contractVersionSchema,
  contractVersionListPageSchema,
} from "@/features/clinic-contracts/history-contract";
let db: PGlite;
const operator = randomUUID(),
  other = randomUUID(),
  clinic = randomUUID(),
  foreign = randomUUID(),
  id = randomUUID(),
  foreignId = randomUUID();
const document = emptyClinicContract();
async function user(who: string, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [who]);
  await db.exec(role === "anon" ? "SET ROLE anon" : "SET ROLE authenticated");
}
async function get(target = id, clinicId = clinic, revision = 1) {
  return (
    await db.query<{ value: unknown }>(
      "SELECT public.tm_get_clinic_contract_draft_version($1,$2,$3) AS value",
      [target, clinicId, revision],
    )
  ).rows[0]!.value;
}
async function list(target = id, clinicId = clinic, before: number | null = null, limit = 10) {
  return (
    await db.query<{ value: unknown }>(
      "SELECT public.tm_list_clinic_contract_draft_versions($1,$2,$3,$4) AS value",
      [target, clinicId, before, limit],
    )
  ).rows[0]!.value;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`,
  );
  for (const name of [
    "001_tenant_foundation.sql",
    "034_clinic_use_contract_drafts.sql",
    "036_clinic_contract_draft_history.sql",
  ])
    await db.exec(
      await readFile(new URL("../../database/migrations/" + name, import.meta.url), "utf8"),
    );
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [operator],
  );
  await db.query(
    "INSERT INTO public.tm_clinics(id,name) VALUES($1,'Histórico QA'),($2,'Outra QA')",
    [clinic, foreign],
  );
  await user(operator);
  for (let n = 0; n < 12; n++)
    await db.query("SELECT public.tm_save_clinic_contract_draft($1,$2,$3,$4::jsonb)", [
      id,
      clinic,
      n,
      JSON.stringify({ ...document, title: "Proposta " + (n + 1), setupCents: n === 0 ? null : n }),
    ]);
  await db.query("SELECT public.tm_save_clinic_contract_draft($1,$2,0,$3::jsonb)", [
    foreignId,
    foreign,
    JSON.stringify(document),
  ]);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("historical reads retain undecided original money and never change current draft", async () => {
  await user(operator);
  const v = contractVersionSchema.parse(await get());
  expect(v).toMatchObject({
    draftId: id,
    clinicId: clinic,
    revision: 1,
    document: { setupCents: null, title: "Proposta 1" },
  });
  expect(Object.keys(v).sort()).toEqual([
    "clinicId",
    "document",
    "draftId",
    "occurredAt",
    "revision",
  ]);
  const current = (
    await db.query<{ value: { revision: number; document: { setupCents: number } } }>(
      "SELECT public.tm_get_clinic_contract_draft($1,$2) AS value",
      [id, clinic],
    )
  ).rows[0]!.value;
  expect(current.revision).toBe(12);
  expect(current.document.setupCents).toBe(11);
});
it("pages descending by immutable revision and exposes metadata only", async () => {
  await user(operator);
  const first = contractVersionListPageSchema.parse(await list());
  expect(first.items.map((i) => i.revision)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
  expect(first.nextCursor).toBe(3);
  expect(Object.keys(first.items[0]!).sort()).toEqual(["occurredAt", "revision", "title"]);
  const last = contractVersionListPageSchema.parse(await list(id, clinic, 3));
  expect(last.items.map((i) => i.revision)).toEqual([2, 1]);
  expect(last.nextCursor).toBeNull();
});
it("another clinic cannot retrieve snapshot or use a foreign cursor", async () => {
  await user(operator);
  expect(await get(id, foreign)).toBeNull();
  expect(contractVersionListPageSchema.parse(await list(id, foreign)).items).toHaveLength(0);
  await expect(list(id, foreign, 3)).rejects.toMatchObject({ code: "22023" });
  await expect(list(foreignId, foreign, 12)).rejects.toMatchObject({ code: "22023" });
  expect(await get(id, clinic, 99)).toBeNull();
  await expect(get(id, clinic, 0)).rejects.toMatchObject({ code: "22023" });
  await expect(list(id, clinic, null, 51)).rejects.toMatchObject({ code: "22023" });
});
it("denies ordinary accounts, anon, direct tables and revoked operator", async () => {
  await user(other);
  await expect(get()).rejects.toMatchObject({ code: "42501" });
  await expect(list()).rejects.toMatchObject({ code: "42501" });
  await user(operator, "anon");
  await expect(get()).rejects.toMatchObject({ code: "42501" });
  await expect(list()).rejects.toMatchObject({ code: "42501" });
  await user(operator);
  await expect(
    db.query("SELECT * FROM public.tm_clinic_contract_draft_versions"),
  ).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_platform_operators SET is_active=false WHERE user_id=$1", [
    operator,
  ]);
  await user(operator);
  await expect(get()).rejects.toMatchObject({ code: "42501" });
  await expect(list()).rejects.toMatchObject({ code: "42501" });
});
