// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { createBlogDraftListEndpoint } from "@/lib/blog/draft-list-endpoint.server";
import { createBlogDraftListClient } from "@/features/blog/draft-list-client";
const id = "11111111-1111-4111-8111-111111111111";
const item = {
  id,
  status: "draft",
  title: "Editorial QA",
  category: "Orientações",
  revision: 1,
  updatedAt: "2026-10-01T10:00:00Z",
};
const page = { query: "", items: [item], nextCursor: null };
function setup() {
  const session = {
    identity: { userId: id, globalRole: "super_admin", links: [] } as AuthenticatedIdentity,
  };
  const resolveSession = vi.fn(async () => session as typeof session | null);
  const read = vi.fn(async (): Promise<unknown> => page);
  return {
    session,
    resolveSession,
    read,
    endpoint: createBlogDraftListEndpoint({ resolveSession, read }),
  };
}
const req = (q = "", method = "GET") =>
  new Request("https://central.example.com/api/platform/blog-drafts" + q, { method });
it("list derives operator from verified session and forwards bounded search/cursor without identities", async () => {
  const { endpoint, session, read } = setup();
  const result = await endpoint(req());
  expect(await result.json()).toEqual({ page });
  expect(read).toHaveBeenCalledWith(session, { p_query: "", p_limit: 25 });
  expect(result.headers.get("cache-control")).toBe("private, no-store");
});
it("denies unknown/duplicated params, invalid cursor/limits and mutations before reading session", async () => {
  const { endpoint, resolveSession } = setup();
  for (const query of [
    "?clinicId=" + id,
    "?limit=1&limit=2",
    "?limit=51",
    "?limit=1e1",
    "?after=bad",
  ])
    expect((await endpoint(req(query))).status).toBe(400);
  expect((await endpoint(req("", "POST"))).status).toBe(405);
  expect(resolveSession).not.toHaveBeenCalled();
});
it("requires authenticated global operator and cannot return hidden body or mismatched filters", async () => {
  const { endpoint, session, read, resolveSession } = setup();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(req())).status).toBe(401);
  delete session.identity.globalRole;
  expect((await endpoint(req())).status).toBe(403);
  session.identity.globalRole = "super_admin";
  for (const wrong of [
    { ...page, query: "other" },
    { ...page, items: [{ ...item, body: "private draft body" }] },
    { ...page, nextCursor: id },
  ]) {
    read.mockResolvedValueOnce(wrong);
    expect((await endpoint(req())).status).toBe(503);
  }
});
it("client uses fresh bearer and rejects repeated/backwards cursor and false filter match", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ page }));
  const client = createBlogDraftListClient(async () => "qa", fetcher);
  expect(await client()).toEqual(page);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/platform/blog-drafts?q=&limit=25",
    expect.objectContaining({
      headers: { Authorization: "Bearer qa" },
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
    }),
  );
  fetcher.mockResolvedValueOnce(Response.json({ page }));
  await expect(client({ after: id })).rejects.toThrow();
  fetcher.mockResolvedValueOnce(Response.json({ page }));
  await expect(client({ q: "missing" })).rejects.toThrow();
});
