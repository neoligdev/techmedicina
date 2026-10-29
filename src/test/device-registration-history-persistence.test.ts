import { deviceRegistrationVersionListPageSchema } from "@/features/devices/registration-version-list-contract";
// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, it, expect } from "vitest";
import { deviceRegistrationDocumentSchema } from "@/features/devices/registration-contract";
import { deviceRegistrationVersionSchema } from "@/features/devices/registration-version-contract";
let db: PGlite;
const operator = randomUUID(),
  other = randomUUID(),
  id = randomUUID();
const original = deviceRegistrationDocumentSchema.parse({
  title: "Unidade QA",
  firmwareVersion: "informado v1",
});
async function user(who: string, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [who]);
  await db.exec(role === "anon" ? "SET ROLE anon" : "SET ROLE authenticated");
}
async function read(target = id, revision = 1) {
  return (
    await db.query<{ value: unknown }>(
      "SELECT public.tm_get_device_registration_draft_version($1,$2) AS value",
      [target, revision],
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
    "039_device_registration_version.sql",
    "040_device_registration_version_list.sql",
  ])
    await db.exec(
      await readFile(new URL("../../database/migrations/" + name, import.meta.url), "utf8"),
    );
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [operator],
  );
  await user(operator);
  await db.query("SELECT public.tm_save_device_registration_draft($1,0,$2::jsonb)", [
    id,
    JSON.stringify(original),
  ]);
  await db.query("SELECT public.tm_save_device_registration_draft($1,1,$2::jsonb)", [
    id,
    JSON.stringify({ ...original, firmwareVersion: "informado v2" }),
  ]);
}, 30000);
afterAll(async () => {
  await db.close();
});
it("reads immutable revision without changing current document or authorizing hardware", async () => {
  await user(operator);
  expect(deviceRegistrationVersionSchema.parse(await read())).toMatchObject({
    draftId: id,
    revision: 1,
    integrationAuthorized: false,
    document: original,
  });
  const current = (
    await db.query<{ value: { revision: number; document: unknown } }>(
      "SELECT public.tm_get_device_registration_draft($1) AS value",
      [id],
    )
  ).rows[0]!.value;
  expect(current).toMatchObject({
    revision: 2,
    document: { ...original, firmwareVersion: "informado v2" },
  });
  expect(await read(randomUUID())).toBeNull();
  expect(await read(id, 3)).toBeNull();
});
it("denies unrelated accounts, anonymous access and direct table reads", async () => {
  await user(other);
  await expect(read()).rejects.toMatchObject({ code: "42501" });
  await user(operator, "anon");
  await expect(read()).rejects.toMatchObject({ code: "42501" });
  await user(operator);
  await expect(
    db.query("SELECT * FROM public.tm_device_registration_draft_versions"),
  ).rejects.toMatchObject({ code: "42501" });
});
it("revalidates operator activation and rejects invalid revision", async () => {
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_platform_operators SET is_active=false WHERE user_id=$1", [
    operator,
  ]);
  await user(operator);
  await expect(read()).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_platform_operators SET is_active=true WHERE user_id=$1", [
    operator,
  ]);
  await user(operator);
  await expect(read(id, 0)).rejects.toMatchObject({ code: "22023" });
});

it("paginates descending historical metadata and rejects absent cursor and unauthorized accounts", async () => {
  await user(operator);
  for (let revision = 2; revision < 12; revision++)
    await db.query("SELECT public.tm_save_device_registration_draft($1,$2,$3::jsonb)", [
      id,
      revision,
      JSON.stringify({ ...original, title: "Unidade revisão " + (revision + 1) }),
    ]);
  const list = async (before: number | null = null) =>
    (
      await db.query<{ value: unknown }>(
        "SELECT public.tm_list_device_registration_draft_versions($1,$2,2) AS value",
        [id, before],
      )
    ).rows[0]!.value;
  const first = deviceRegistrationVersionListPageSchema.parse(await list());
  expect(first.items.map((i) => i.revision)).toEqual([12, 11]);
  expect(first.nextCursor).toBe(11);
  const second = deviceRegistrationVersionListPageSchema.parse(await list(11));
  expect(second.items.map((i) => i.revision)).toEqual([10, 9]);
  expect(JSON.stringify(first)).not.toMatch(/document|actor_user_id|notes|firmwareVersion/);
  await expect(list(99)).rejects.toMatchObject({ code: "22023" });
  await user(other);
  await expect(list()).rejects.toMatchObject({ code: "42501" });
  await user(operator, "anon");
  await expect(list()).rejects.toMatchObject({ code: "42501" });
});
