// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, it, expect } from "vitest";
import {
  deviceRegistrationDocumentSchema,
  savedDeviceRegistrationSchema,
} from "@/features/devices/registration-contract";
let db: PGlite;
const operator = randomUUID(),
  other = randomUUID();
const document = deviceRegistrationDocumentSchema.parse({
  title: "Unidade QA",
  model: "Modelo informado QA",
  claimedIdentifier: "ETIQUETA-QA",
  firmwareVersion: "v1 informado",
});
async function user(who: string, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [who]);
  await db.exec(role === "anon" ? "SET ROLE anon" : "SET ROLE authenticated");
}
async function get(id: string) {
  return (
    await db.query<{ value: unknown }>(
      "SELECT public.tm_get_device_registration_draft($1) AS value",
      [id],
    )
  ).rows[0]!.value;
}
async function save(id: string, revision: number, doc: unknown = document) {
  return (
    await db.query<{ value: unknown }>(
      "SELECT public.tm_save_device_registration_draft($1,$2,$3::jsonb) AS value",
      [id, revision, JSON.stringify(doc)],
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
    "037_device_registration_drafts.sql",
    "038_device_registration_draft_list.sql",
  ])
    await db.exec(
      await readFile(new URL("../../database/migrations/" + name, import.meta.url), "utf8"),
    );
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [operator],
  );
}, 30000);
afterAll(async () => {
  await db.close();
});
it("stores declared metadata and snapshots without authorizing integration or creating patient links", async () => {
  await user(operator);
  const id = randomUUID();
  expect(await get(id)).toBeNull();
  const first = savedDeviceRegistrationSchema.parse(await save(id, 0));
  expect(first).toMatchObject({
    id,
    status: "draft",
    integrationAuthorized: false,
    revision: 1,
    document,
  });
  expect(await save(id, 0)).toEqual(first);
  const changed = { ...document, firmwareVersion: "v2 informada" };
  const updated = savedDeviceRegistrationSchema.parse(await save(id, 1, changed));
  expect(updated.revision).toBe(2);
  expect(updated.integrationAuthorized).toBe(false);
  expect(await save(id, 2, changed)).toEqual(updated);
  await expect(save(id, 1, document)).rejects.toMatchObject({ code: "40001" });
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query<{ document: unknown }>(
        "SELECT document FROM public.tm_device_registration_draft_versions WHERE draft_id=$1 ORDER BY revision",
        [id],
      )
    ).rows.map((r) => r.document),
  ).toEqual([document, changed]);
  expect(
    (await db.query<{ n: number }>("SELECT count(*)::integer AS n FROM public.tm_memberships"))
      .rows[0]!.n,
  ).toBe(0);
});
it("firmware or claimed identifier is not a globally authenticated hardware identity", async () => {
  await user(operator);
  const a = savedDeviceRegistrationSchema.parse(await save(randomUUID(), 0));
  const b = savedDeviceRegistrationSchema.parse(await save(randomUUID(), 0));
  expect(a.id).not.toBe(b.id);
  expect(a.document.firmwareVersion).toBe(b.document.firmwareVersion);
  expect(a.integrationAuthorized || b.integrationAuthorized).toBe(false);
});
it("SQL independently rejects liberation, tenant assignment and invalid metadata", async () => {
  await user(operator);
  for (const bad of [
    { ...document, integrationAuthorized: true },
    { ...document, clinicId: randomUUID() },
    { ...document, patientId: randomUUID() },
    { ...document, status: "released" },
    { ...document, model: 42 },
    { ...document, firmwareVersion: "x".repeat(161) },
    { ...document, title: " " },
    { title: "Incomplete" },
  ])
    await expect(save(randomUUID(), 0, bad)).rejects.toMatchObject({ code: "22023" });
});
it("denies ordinary/clinic accounts, anon, table mutation and revoked operator", async () => {
  await user(operator);
  const id = randomUUID();
  await save(id, 0);
  await expect(
    db.query("UPDATE public.tm_device_registration_drafts SET revision=99"),
  ).rejects.toMatchObject({ code: "42501" });
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
  await expect(save(id, 1)).rejects.toMatchObject({ code: "42501" });
});

it("lists declared metadata in bounded pages and searches identifiers literally without granting access", async () => {
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_platform_operators SET is_active=true WHERE user_id=$1", [
    operator,
  ]);
  await user(operator);
  const ids = Array.from({ length: 26 }, () => randomUUID()).sort();
  for (const id of ids)
    await save(id, 0, { ...document, title: "Biblioteca QA", claimedIdentifier: "DECLARADO%_QA" });
  const list = async (q = "declarado%_qa", after: string | null = null) =>
    (
      await db.query<{
        value: {
          items: {
            id: string;
            integrationAuthorized: boolean;
            model: string;
            claimedIdentifier: string;
            firmwareVersion: string;
          }[];
          nextCursor: string | null;
        };
      }>("SELECT public.tm_list_device_registration_drafts($1,$2,25) AS value", [q, after])
    ).rows[0]!.value;
  const first = await list();
  expect(first.items.map((i) => i.id)).toEqual(ids.slice(0, 25));
  expect(first.nextCursor).toBe(ids[24]);
  expect((await list("declarado%_qa", first.nextCursor)).items.map((i) => i.id)).toEqual(
    ids.slice(25),
  );
  expect(first.items.every((i) => i.integrationAuthorized === false)).toBe(true);
  expect(first.items[0]).toMatchObject({
    model: document.model,
    claimedIdentifier: "DECLARADO%_QA",
    firmwareVersion: document.firmwareVersion,
  });
  expect(Object.keys(first.items[0]!).sort()).toEqual([
    "claimedIdentifier",
    "firmwareVersion",
    "id",
    "integrationAuthorized",
    "model",
    "revision",
    "status",
    "title",
    "updatedAt",
  ]);
  expect((await list("DECLARADOANYQA")).items).toHaveLength(0);
  expect((await list("Modelo informado QA")).items.length).toBeGreaterThan(0);
  await expect(list("no-match", first.nextCursor)).rejects.toMatchObject({ code: "22023" });
  await user(other);
  await expect(list()).rejects.toMatchObject({ code: "42501" });
  await user(operator, "anon");
  await expect(list()).rejects.toMatchObject({ code: "42501" });
});
