// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, expect, it } from "vitest";
import { blogDraftDocumentSchema, savedBlogDraftSchema } from "@/features/blog/draft-contract";
let db: PGlite;
const operator = randomUUID(),
  other = randomUUID();
const doc = blogDraftDocumentSchema.parse({
  title: "Conteúdo editorial QA",
  body: "Texto fictício sem dados de pacientes.",
});
async function user(id: string, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(role === "anon" ? "SET ROLE anon" : "SET ROLE authenticated");
}
async function save(id: string, revision: number, document: unknown = doc) {
  return (
    await db.query<{ value: unknown }>(
      "SELECT public.tm_save_blog_draft($1,$2,$3::jsonb) AS value",
      [id, revision, JSON.stringify(document)],
    )
  ).rows[0]!.value;
}
async function get(id: string) {
  return (await db.query<{ value: unknown }>("SELECT public.tm_get_blog_draft($1) AS value", [id]))
    .rows[0]!.value;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `CREATE ROLE anon NOLOGIN;CREATE ROLE authenticated NOLOGIN;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`,
  );
  for (const f of ["001_tenant_foundation.sql", "030_central_blog_drafts.sql"])
    await db.exec(
      await readFile(new URL("../../database/migrations/" + f, import.meta.url), "utf8"),
    );
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [operator],
  );
}, 30000);
afterAll(async () => {
  await db.close();
});
it("create retry, update and read preserve editorial revision and immutable snapshots", async () => {
  await user(operator);
  const id = randomUUID();
  expect(await get(id)).toBeNull();
  const created = savedBlogDraftSchema.parse(await save(id, 0));
  expect(created).toMatchObject({ id, status: "draft", revision: 1, document: doc });
  expect(await save(id, 0)).toEqual(created);
  const changed = { ...doc, summary: "Resumo revisado" };
  const updated = savedBlogDraftSchema.parse(await save(id, 1, changed));
  expect(updated.revision).toBe(2);
  expect(await get(id)).toEqual(updated);
  expect(await save(id, 2, changed)).toEqual(updated);
  await expect(save(id, 1, doc)).rejects.toMatchObject({ code: "40001" });
  await db.exec("RESET ROLE");
  const versions = (
    await db.query<{ revision: number; document: unknown; actor_user_id: string }>(
      "SELECT revision,document,actor_user_id FROM public.tm_blog_draft_versions WHERE draft_id=$1 ORDER BY revision",
      [id],
    )
  ).rows;
  expect(versions.map((v) => v.revision)).toEqual([1, 2]);
  expect(versions[0]!.document).toEqual(doc);
  expect(versions.every((v) => v.actor_user_id === operator)).toBe(true);
});
it("SQL independently rejects invalid fields, publication flags, invalid revisions and oversized text", async () => {
  await user(operator);
  for (const bad of [
    { ...doc, published: true },
    { ...doc, title: "\n\t " },
    { ...doc, body: "x".repeat(20001) },
    { ...doc, authorName: 42 },
    { title: "incomplete" },
  ])
    await expect(save(randomUUID(), 0, bad)).rejects.toMatchObject({ code: "22023" });
  await expect(save(randomUUID(), -1)).rejects.toMatchObject({ code: "22023" });
  await expect(save(randomUUID(), 1)).rejects.toMatchObject({ code: "40001" });
});
it("clinic roles, arbitrary accounts, anon, revoked operator and direct table writes cannot access drafts", async () => {
  const id = randomUUID();
  await user(operator);
  await save(id, 0);
  await user(other);
  await expect(get(id)).rejects.toMatchObject({ code: "42501" });
  await expect(save(id, 1)).rejects.toMatchObject({ code: "42501" });
  await user(operator, "anon");
  await expect(get(id)).rejects.toMatchObject({ code: "42501" });
  await user(operator);
  for (const q of [
    "SELECT * FROM public.tm_blog_drafts",
    "SELECT * FROM public.tm_blog_draft_versions",
    "UPDATE public.tm_blog_drafts SET revision=99",
    "DELETE FROM public.tm_blog_draft_versions",
  ])
    await expect(db.exec(q)).rejects.toMatchObject({ code: "42501" });
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
