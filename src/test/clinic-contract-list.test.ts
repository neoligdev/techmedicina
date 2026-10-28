// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { createClinicContractListEndpoint } from "@/lib/clinic-contracts/list-endpoint.server";
import { createClinicContractListClient } from "@/features/clinic-contracts/list-client";
const id = "11111111-1111-4111-8111-111111111111",
  clinicId = "22222222-2222-4222-8222-222222222222";
const item = {
  id,
  status: "draft",
  title: "Contrato QA",
  revision: 1,
  updatedAt: "2026-10-28T10:00:00Z",
};
const page = { clinicId, query: "", items: [item], nextCursor: null };
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
    endpoint: createClinicContractListEndpoint({ resolveSession, read }),
  };
}
const req = (q = "clinicId=" + clinicId, method = "GET") =>
  new Request("https://central.example/api/platform/clinic-contract-drafts?" + q, { method });
it("forwards only clinic-scoped bounded parameters and private metadata", async () => {
  const { endpoint, read, session } = setup();
  const r = await endpoint(req());
  expect(await r.json()).toEqual({ page });
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  expect(read).toHaveBeenCalledWith(session, { p_clinic_id: clinicId, p_query: "", p_limit: 25 });
});
it("rejects malformed params and denies nonoperators before RPC", async () => {
  const { endpoint, resolveSession, session, read } = setup();
  for (const q of [
    "",
    "clinicId=bad",
    "clinicId=" + clinicId + "&limit=51",
    "clinicId=" + clinicId + "&limit=1e1",
    "clinicId=" + clinicId + "&after=bad",
    "clinicId=" + clinicId + "&clinicId=" + id,
    "clinicId=" + clinicId + "&actor=" + id,
  ])
    expect((await endpoint(req(q))).status).toBe(400);
  expect((await endpoint(req(undefined, "POST"))).status).toBe(405);
  expect(resolveSession).not.toHaveBeenCalled();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(req())).status).toBe(401);
  session.identity.globalRole = "admin";
  expect((await endpoint(req())).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
});
it("rejects another clinic, wrong filter, body leakage and inconsistent cursor", async () => {
  const { endpoint, read } = setup();
  for (const bad of [
    { ...page, clinicId: id },
    { ...page, query: "other" },
    { ...page, items: [{ ...item, document: { secret: true } }] },
    { ...page, items: [item, item] },
    { ...page, nextCursor: id },
  ]) {
    read.mockResolvedValueOnce(bad);
    expect((await endpoint(req())).status).toBe(503);
  }
});
it("client rechecks clinic/cursor and obtains fresh token per request", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ page }));
  const token = vi.fn(async () => "qa"),
    read = createClinicContractListClient(token, fetcher);
  expect(await read({ clinicId })).toEqual(page);
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    headers: { Authorization: "Bearer qa" },
  });
  for (const bad of [
    { ...page, clinicId: id },
    { ...page, nextCursor: id },
  ]) {
    fetcher.mockResolvedValueOnce(Response.json({ page: bad }));
    await expect(read({ clinicId })).rejects.toThrow();
  }
  fetcher.mockResolvedValueOnce(Response.json({ page }));
  await expect(read({ clinicId, after: id })).rejects.toThrow();
  expect(token).toHaveBeenCalledTimes(4);
});
