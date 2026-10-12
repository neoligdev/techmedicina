// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
let db: PGlite;
const valid = { name: "Clínica", primary: "#123456", secondary: "#abcdef", mode: "dark" };
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
  for (const file of [
    "001_tenant_foundation.sql",
    "002_clinic_administration.sql",
    "003_clinic_branding.sql",
    "005_strict_texture_validation.sql",
  ])
    await db.exec(
      await readFile(new URL(`../../database/migrations/${file}`, import.meta.url), "utf8"),
    );
}, 30000);
afterAll(async () => {
  await db?.close();
});
it.each([
  {},
  null,
  { ...valid, name: null },
  { ...valid, name: undefined },
  { ...valid, primary: undefined },
  { ...valid, secondary: undefined },
  { ...valid, mode: undefined },
  { ...valid, logo: null },
  { ...valid, textureUrl: null },
  { ...valid, customTextures: null },
  { ...valid, textureUrl: "/textures/../../api/platform/clinics" },
  { ...valid, textureUrl: "https://example.com/a.png" },
  { ...valid, textureUrl: "data:image/png;base64,aGVsbG8=" },
  { ...valid, customTextures: [{}] },
])("nega preferências malformadas no PostgreSQL: %j", async (value) => {
  const result = await db.query<{ accepted: boolean }>(
    "SELECT public.tm_valid_branding($1::jsonb) AS accepted",
    [JSON.stringify(value)],
  );
  expect(result.rows[0]?.accepted).toBe(false);
});
it("preserva preferências válidas e recursos conhecidos", async () => {
  for (const value of [valid, { ...valid, textureUrl: "/textures/texture-3.jpg" }]) {
    const result = await db.query<{ accepted: boolean }>(
      "SELECT public.tm_valid_branding($1::jsonb) AS accepted",
      [JSON.stringify(value)],
    );
    expect(result.rows[0]?.accepted).toBe(true);
  }
});
