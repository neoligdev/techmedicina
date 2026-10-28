// @vitest-environment node
import { it, expect, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { createDeviceRegistrationEndpoint } from "@/lib/devices/registration-endpoint.server";
import { createDeviceRegistrationClient } from "@/features/devices/registration-client";
import { deviceRegistrationDocumentSchema } from "@/features/devices/registration-contract";
const id = "11111111-1111-4111-8111-111111111111",
  document = deviceRegistrationDocumentSchema.parse({ title: "Unidade QA" });
const draft = {
    id,
    status: "draft",
    integrationAuthorized: false,
    revision: 1,
    document,
    createdAt: "2026-10-28T10:00:00Z",
    updatedAt: "2026-10-28T10:00:00Z",
  },
  input = { id, expectedRevision: 0, document };
const req = (method = "GET", body?: unknown) =>
  new Request("https://central.example/api/platform/device-registration-draft?id=" + id, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
function setup() {
  const session = {
    identity: { userId: id, globalRole: "super_admin", links: [] } as AuthenticatedIdentity,
  };
  const resolveSession = vi.fn(async () => session as typeof session | null),
    rpc = vi.fn(async (): Promise<unknown> => draft);
  return {
    session,
    resolveSession,
    rpc,
    endpoint: createDeviceRegistrationEndpoint({ resolveSession, rpc }),
  };
}
it("saves only admin-scoped metadata with explicit nonauthorization and private receipt", async () => {
  const { endpoint, rpc, session } = setup();
  const r = await endpoint(req("PUT", input));
  expect(await r.json()).toEqual({ draft });
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  expect(rpc).toHaveBeenCalledWith(session, "tm_save_device_registration_draft", {
    p_draft_id: id,
    p_expected_revision: 0,
    p_document: document,
  });
});
it("does not trust authorization or identity supplied by browser and denies nonoperators", async () => {
  const { endpoint, rpc, resolveSession, session } = setup();
  for (const bad of [
    { ...input, integrationAuthorized: true },
    { ...input, actor: id },
    { ...input, document: { ...document, release: true } },
  ])
    expect((await endpoint(req("PUT", bad))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(req())).status).toBe(401);
  session.identity.globalRole = "admin";
  expect((await endpoint(req())).status).toBe(403);
  expect(rpc).not.toHaveBeenCalled();
});
it("rejects alleged release or mismatched acknowledgement on server and client", async () => {
  const { endpoint, rpc } = setup();
  rpc.mockResolvedValueOnce({ ...draft, integrationAuthorized: true });
  expect((await endpoint(req())).status).toBe(503);
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ draft: { ...draft, integrationAuthorized: true } }));
  await expect(
    createDeviceRegistrationClient(async () => "qa", fetcher).save(input),
  ).rejects.toThrow();
  fetcher.mockResolvedValueOnce(Response.json({ draft }));
  expect(await createDeviceRegistrationClient(async () => "qa", fetcher).save(input)).toEqual(
    draft,
  );
  expect(fetcher.mock.calls[1]![1]).toMatchObject({
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
  });
});
