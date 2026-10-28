// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { createBlogVersionListEndpoint } from "@/lib/blog/version-list-endpoint.server";
import { createBlogVersionListClient } from "@/features/blog/version-list-client";
const id = "11111111-1111-4111-8111-111111111111";
const item = (revision: number) => ({
  revision,
  title: "Versão " + revision,
  occurredAt: "2026-10-28T10:00:00Z",
});
const page = { draftId: id, items: [item(2), item(1)], nextCursor: null };
function setup() {
  const session = {
    identity: { userId: id, globalRole: "super_admin", links: [] } as AuthenticatedIdentity,
  };
  const resolveSession = vi.fn(async () => session as typeof session | null),
    read = vi.fn(async (): Promise<unknown> => page);
  return {
    session,
    resolveSession,
    read,
    endpoint: createBlogVersionListEndpoint({ resolveSession, read }),
  };
}
const req = (query = "id=" + id, method = "GET") =>
  new Request("https://central.example/api/platform/blog-draft-versions?" + query, { method });
it("reads bounded metadata and keeps response private", async () => {
  const { endpoint, read, session } = setup();
  const r = await endpoint(req());
  expect(await r.json()).toEqual({ page });
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  expect(r.headers.get("vary")).toBe("Authorization");
  expect(read).toHaveBeenCalledWith(session, { p_draft_id: id, p_limit: 10 });
});
it("rejects writes, malformed and duplicated queries before authorization or RPC", async () => {
  const { endpoint, resolveSession } = setup();
  for (const q of [
    "id=bad",
    "id=" + id + "&limit=51",
    "id=" + id + "&before=0",
    "id=" + id + "&limit=1e1",
    "id=" + id + "&before=2147483648",
    "id=" + id + "&before=1&before=2",
    "id=" + id + "&actor=other",
  ])
    expect((await endpoint(req(q))).status).toBe(400);
  expect((await endpoint(req(undefined, "POST"))).status).toBe(405);
  expect(resolveSession).not.toHaveBeenCalled();
});
it("denies anonymous and clinic accounts and rejects mismatched, duplicate, ascending or overexposed pages", async () => {
  const { endpoint, resolveSession, session, read } = setup();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(req())).status).toBe(401);
  session.identity.globalRole = "medico";
  expect((await endpoint(req())).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
  session.identity.globalRole = "super_admin";
  for (const bad of [
    { ...page, draftId: "22222222-2222-4222-8222-222222222222" },
    { ...page, items: [item(1), item(2)] },
    { ...page, items: [item(2), item(2)] },
    { ...page, items: [{ ...item(1), document: { body: "hidden" } }] },
    { ...page, nextCursor: 1 },
  ]) {
    read.mockResolvedValueOnce(bad);
    expect((await endpoint(req())).status).toBe(503);
  }
});
it("client enforces descending cursor scope, page bound, token and private fetch", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ page }));
  const client = createBlogVersionListClient(async () => "qa", fetcher);
  expect(await client({ id })).toEqual(page);
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    headers: { Authorization: "Bearer qa" },
  });
  fetcher.mockResolvedValueOnce(Response.json({ page }));
  await expect(client({ id, before: 2 })).rejects.toThrow();
  fetcher.mockResolvedValueOnce(Response.json({ page }));
  await expect(client({ id, limit: 1 })).rejects.toThrow();
  fetcher.mockClear();
  await expect(createBlogVersionListClient(async () => null, fetcher)({ id })).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
