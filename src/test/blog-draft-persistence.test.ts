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
  for (const f of [
    "001_tenant_foundation.sql",
    "030_central_blog_drafts.sql",
    "031_central_blog_draft_list.sql",
    "032_central_blog_draft_version.sql",
    "033_central_blog_version_list.sql",
  ])
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
it("central library pages metadata by stable UUID and searches title literally", async () => {
  await user(operator);
  const ids = [randomUUID(), randomUUID(), randomUUID()].sort();
  for (let i = 0; i < ids.length; i++)
    await save(ids[i]!, 0, {
      ...doc,
      title: "Library QA " + i + (i === 0 ? " 100%" : ""),
      body: "DO NOT RETURN BODY",
    });
  const read = async (q = "Library QA", after: string | null = null, limit = 2) =>
    (
      await db.query<{
        page: {
          query: string;
          items: Array<{ id: string; title: string }>;
          nextCursor: string | null;
        };
      }>("SELECT public.tm_list_blog_drafts($1,$2,$3) AS page", [q, after, limit])
    ).rows[0]!.page;
  const first = await read();
  expect(first.items.map((i) => i.id)).toEqual(ids.slice(0, 2));
  expect(first.nextCursor).toBe(ids[1]);
  expect(Object.keys(first.items[0]!).sort()).toEqual(
    ["id", "status", "title", "category", "revision", "updatedAt"].sort(),
  );
  const second = await read("Library QA", first.nextCursor);
  expect(second.items.map((i) => i.id)).toEqual(ids.slice(2));
  expect(second.nextCursor).toBeNull();
  expect((await read("%")).items.map((i) => i.id)).toEqual([ids[0]]);
  expect((await read("library qa")).items).toHaveLength(2);
  expect((await read("not matching")).items).toEqual([]);
  await expect(read("Library QA", randomUUID())).rejects.toMatchObject({ code: "22023" });
  await expect(read("Library QA", null, 51)).rejects.toMatchObject({ code: "22023" });
  await user(other);
  await expect(read()).rejects.toMatchObject({ code: "42501" });
  await user(operator, "anon");
  await expect(read()).rejects.toMatchObject({ code: "42501" });
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
});

it("version RPC reads original snapshots without modifying current draft and denies other accounts", async () => {
  await user(operator);
  const id = randomUUID();
  await save(id, 0);
  await save(id, 1, { ...doc, title: "Título posterior" });
  const read = () =>
    db.query<{ value: { document: unknown } }>(
      "SELECT public.tm_get_blog_draft_version($1,$2) AS value",
      [id, 1],
    );
  expect((await read()).rows[0]!.value.document).toEqual(doc);
  expect(savedBlogDraftSchema.parse(await get(id)).revision).toBe(2);
  expect(
    (
      await db.query<{ value: unknown }>(
        "SELECT public.tm_get_blog_draft_version($1,99) AS value",
        [id],
      )
    ).rows[0]!.value,
  ).toBeNull();
  await expect(
    db.query("SELECT public.tm_get_blog_draft_version($1,0)", [id]),
  ).rejects.toMatchObject({ code: "22023" });
  await user(other);
  await expect(read()).rejects.toMatchObject({ code: "42501" });
  await user(operator, "anon");
  await expect(read()).rejects.toMatchObject({ code: "42501" });
  await user(operator);
  await expect(db.query("SELECT * FROM public.tm_blog_draft_versions")).rejects.toMatchObject({
    code: "42501",
  });
});

it("version metadata pages descend within one draft and reject foreign cursors and revoked access", async () => {
  await user(operator);
  const id = randomUUID(),
    foreign = randomUUID();
  await save(id, 0);
  await save(foreign, 0);
  for (let n = 1; n < 12; n++) await save(id, n, { ...doc, title: "Histórico " + (n + 1) });
  const list = async (before: number | null = null, limit = 10) =>
    (
      await db.query<{
        value: {
          draftId: string;
          items: { revision: number; title: string; occurredAt: string }[];
          nextCursor: number | null;
        };
      }>("SELECT public.tm_list_blog_draft_versions($1,$2,$3) AS value", [id, before, limit])
    ).rows[0]!.value;
  const first = await list();
  expect(first.draftId).toBe(id);
  expect(first.items.map((v) => v.revision)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
  expect(first.nextCursor).toBe(3);
  expect(Object.keys(first.items[0]!).sort()).toEqual(["occurredAt", "revision", "title"]);
  expect((await list(3)).items.map((v) => v.revision)).toEqual([2, 1]);
  expect((await list(3)).nextCursor).toBeNull();
  await save(id, 12, { ...doc, title: "Nova versão" });
  expect((await list(3)).items.map((v) => v.revision)).toEqual([2, 1]);
  await expect(list(99)).rejects.toMatchObject({ code: "22023" });
  await expect(list(null, 51)).rejects.toMatchObject({ code: "22023" });
  await expect(
    db.query("SELECT public.tm_list_blog_draft_versions($1,12,10)", [foreign]),
  ).rejects.toMatchObject({ code: "22023" });
  await user(other);
  await expect(list()).rejects.toMatchObject({ code: "42501" });
  await user(operator, "anon");
  await expect(list()).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_platform_operators SET is_active=false WHERE user_id=$1", [
    operator,
  ]);
  await user(operator);
  await expect(list()).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_platform_operators SET is_active=true WHERE user_id=$1", [
    operator,
  ]);
});
