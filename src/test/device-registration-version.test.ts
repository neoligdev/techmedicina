// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { createDeviceRegistrationVersionEndpoint } from "@/lib/devices/registration-version-endpoint.server";
import { deviceRegistrationDocumentSchema } from "@/features/devices/registration-contract";
const id = "11111111-1111-4111-8111-111111111111";
const version = {
  integrationAuthorized: false,
  draftId: id,
  revision: 1,
  document: deviceRegistrationDocumentSchema.parse({ title: "Original" }),
  occurredAt: "2026-10-28T10:00:00Z",
};
function setup() {
  const session = {
    identity: { userId: id, globalRole: "super_admin", links: [] } as AuthenticatedIdentity,
  };
  const resolveSession = vi.fn(async () => session as typeof session | null);
  const read = vi.fn(async (): Promise<unknown> => version);
  return {
    session,
    resolveSession,
    read,
    endpoint: createDeviceRegistrationVersionEndpoint({ resolveSession, read }),
  };
}
const req = (q = "id=" + id + "&revision=1", method = "GET") =>
  new Request("https://central.example/api/platform/device-registration-version?" + q, { method });
it("reads exact snapshot privately and distinguishes missing version", async () => {
  const { endpoint, session, read } = setup();
  const response = await endpoint(req());
  expect(await response.json()).toEqual({ version });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("vary")).toBe("Authorization");
  expect(read).toHaveBeenCalledWith(session, { p_draft_id: id, p_revision: 1 });
  read.mockResolvedValueOnce(null);
  expect(await (await endpoint(req())).json()).toEqual({ version: null });
});
it("rejects malformed, duplicate, extra parameters and writes before RPC", async () => {
  const { endpoint, read } = setup();
  for (const q of [
    "id=bad&revision=1",
    "id=" + id + "&revision=0",
    "id=" + id + "&revision=1e1",
    "id=" + id + "&revision=2147483648",
    "id=" + id + "&revision=1&revision=2",
    "id=" + id + "&revision=1&clinicId=" + id,
  ])
    expect((await endpoint(req(q))).status).toBe(400);
  expect((await endpoint(req(undefined, "POST"))).status).toBe(405);
  expect(read).not.toHaveBeenCalled();
});
it("denies absent session and clinic roles before reading", async () => {
  const { endpoint, session, resolveSession, read } = setup();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(req())).status).toBe(401);
  session.identity.globalRole = "medico";
  expect((await endpoint(req())).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
});
it("rejects wrong revision, wrong draft and private extra fields without leaking data", async () => {
  const { endpoint, read } = setup();
  for (const value of [
    { ...version, revision: 2 },
    { ...version, integrationAuthorized: true },
    { ...version, draftId: "22222222-2222-4222-8222-222222222222" },
    { ...version, actor_user_id: id },
  ]) {
    read.mockResolvedValueOnce(value);
    const r = await endpoint(req());
    expect(r.status).toBe(503);
    expect(JSON.stringify(await r.json())).not.toContain(id);
  }
});
