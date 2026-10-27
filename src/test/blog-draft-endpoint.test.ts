// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createBlogDraftEndpoint } from "@/lib/blog/draft-endpoint.server";
import { blogDraftDocumentSchema } from "@/features/blog/draft-contract";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { AuthError } from "@/lib/auth/guards.server";
const id = "11111111-1111-4111-8111-111111111111";
const document = blogDraftDocumentSchema.parse({ title: "Editorial QA" });
const draft = {
  id,
  status: "draft",
  document,
  revision: 1,
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
};
function setup() {
  const session = {
    identity: { userId: id, globalRole: "super_admin", links: [] } as AuthenticatedIdentity,
  };
  const resolveSession = vi.fn(async () => session as typeof session | null);
  const rpc = vi.fn(async (): Promise<unknown> => draft);
  return {
    session,
    resolveSession,
    rpc,
    endpoint: createBlogDraftEndpoint({ resolveSession, rpc }),
  };
}
const req = (
  method = "GET",
  body?: string,
  query = "?id=" + id,
  contentType = "application/json",
) =>
  new Request("https://central.example.com/api/platform/blog-draft" + query, {
    method,
    headers: { "Content-Type": contentType },
    ...(body ? { body } : {}),
  });
it("GET and PUT use verified operator session and strict minimal draft receipt", async () => {
  const { endpoint, rpc, session } = setup();
  expect(await (await endpoint(req())).json()).toEqual({ draft });
  expect(rpc).toHaveBeenCalledWith(session, "tm_get_blog_draft", { p_draft_id: id });
  const response = await endpoint(
    req("PUT", JSON.stringify({ id, expectedRevision: 0, document })),
  );
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenLastCalledWith(session, "tm_save_blog_draft", {
    p_draft_id: id,
    p_expected_revision: 0,
    p_document: document,
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("denies absent session and clinic admin, medical or patient identities before RPC", async () => {
  const { endpoint, resolveSession, session, rpc } = setup();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(req())).status).toBe(401);
  delete session.identity.globalRole;
  for (const role of ["admin", "medico", "paciente"] as const) {
    session.identity.links = [{ clinicId: id, role, isActive: true, grants: [] }];
    expect((await endpoint(req())).status).toBe(403);
  }
  expect(rpc).not.toHaveBeenCalled();
});
it("rejects query tampering, unknown publication fields, wrong UUID, excessive UTF8 body and unsupported methods", async () => {
  const { endpoint, rpc } = setup();
  expect((await endpoint(req("POST"))).status).toBe(405);
  expect((await endpoint(req("GET", undefined, "?id=" + id + "&id=" + id))).status).toBe(400);
  expect(
    (
      await endpoint(
        req("PUT", JSON.stringify({ id, expectedRevision: 0, document, publish: true })),
      )
    ).status,
  ).toBe(400);
  expect((await endpoint(req("PUT", "{}", "?id=" + id, "text/plain"))).status).toBe(415);
  expect((await endpoint(req("PUT", "x".repeat(131073)))).status).toBe(413);
  expect(rpc).not.toHaveBeenCalled();
});
it("does not confirm foreign/missing receipt or hide a revision conflict", async () => {
  const { endpoint, rpc } = setup();
  rpc.mockResolvedValueOnce({ ...draft, id: "22222222-2222-4222-8222-222222222222" });
  expect((await endpoint(req())).status).toBe(503);
  rpc.mockResolvedValueOnce(null);
  expect(
    (await endpoint(req("PUT", JSON.stringify({ id, expectedRevision: 0, document })))).status,
  ).toBe(503);
  rpc.mockRejectedValueOnce(new AuthError("Private SQL details", 409));
  const conflict = await endpoint(
    req("PUT", JSON.stringify({ id, expectedRevision: 0, document })),
  );
  expect(conflict.status).toBe(409);
  expect(await conflict.text()).not.toContain("SQL");
});
