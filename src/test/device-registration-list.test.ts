// @vitest-environment node
import { it, expect, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { createDeviceRegistrationListEndpoint } from "@/lib/devices/registration-list-endpoint.server";
import { createDeviceRegistrationListClient } from "@/features/devices/registration-list-client";
const id = "11111111-1111-4111-8111-111111111111";
const item = {
  id,
  status: "draft",
  model: "Modelo QA",
  claimedIdentifier: "ETIQUETA QA",
  firmwareVersion: "v1 informada",
  integrationAuthorized: false,
  title: "Unidade QA",
  revision: 1,
  updatedAt: "2026-10-28T10:00:00Z",
};
const page = { query: "", items: [item], nextCursor: null };
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
    endpoint: createDeviceRegistrationListEndpoint({ resolveSession, read }),
  };
}
const req = (q = "", method = "GET") =>
  new Request("https://central.example/api/platform/device-registration-drafts" + q, { method });
it("returns minimal declared metadata only to platform operator", async () => {
  const { endpoint, session, read } = setup();
  const r = await endpoint(req());
  expect(await r.json()).toEqual({ page });
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  expect(read).toHaveBeenCalledWith(session, { p_query: "", p_limit: 25 });
});
it("rejects invalid params and nonoperator before listing", async () => {
  const { endpoint, resolveSession, session, read } = setup();
  for (const q of ["?limit=51", "?limit=1e1", "?after=bad", "?q=a&q=b", "?actor=other"])
    expect((await endpoint(req(q))).status).toBe(400);
  expect((await endpoint(req("", "POST"))).status).toBe(405);
  expect(resolveSession).not.toHaveBeenCalled();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(req())).status).toBe(401);
  session.identity.globalRole = "medico";
  expect((await endpoint(req())).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
});
it("server and client reject alleged device liberation and hidden fields in list", async () => {
  const { endpoint, read } = setup();
  for (const bad of [
    { ...page, items: [{ ...item, integrationAuthorized: true }] },
    { ...page, items: [{ ...item, notes: "private" }] },
    { ...page, nextCursor: id },
    { ...page, items: [item, item] },
  ]) {
    read.mockResolvedValueOnce(bad);
    expect((await endpoint(req())).status).toBe(503);
  }
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ page: { ...page, items: [{ ...item, integrationAuthorized: true }] } }),
    );
  await expect(createDeviceRegistrationListClient(async () => "qa", fetcher)()).rejects.toThrow();
});
it("client forwards literal query with fresh token and validates cursor/filter echo", async () => {
  const token = vi.fn(async () => "qa"),
    fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ page: { ...page, query: "%_" } }));
  const read = createDeviceRegistrationListClient(token, fetcher);
  expect((await read({ q: "%_" })).query).toBe("%_");
  expect(
    new URL(String(fetcher.mock.calls[0]![0]), "https://central.example").searchParams.get("q"),
  ).toBe("%_");
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    headers: { Authorization: "Bearer qa" },
  });
  fetcher.mockResolvedValueOnce(Response.json({ page }));
  await expect(read({ after: id })).rejects.toThrow();
});
