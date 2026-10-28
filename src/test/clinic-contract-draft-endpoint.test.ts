// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { AuthError } from "@/lib/auth/guards.server";
import { createClinicContractDraftEndpoint } from "@/lib/clinic-contracts/draft-endpoint.server";
import { emptyClinicContract } from "@/features/clinic-contracts/contracts";
const id = "11111111-1111-4111-8111-111111111111",
  clinicId = "22222222-2222-4222-8222-222222222222";
const draft = {
  id,
  clinicId,
  status: "draft",
  revision: 1,
  document: emptyClinicContract(),
  createdAt: "2026-10-28T10:00:00Z",
  updatedAt: "2026-10-28T10:00:00Z",
};
const input = { id, clinicId, expectedRevision: 0, document: draft.document };
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
    endpoint: createClinicContractDraftEndpoint({ resolveSession, rpc }),
  };
}
const req = (method = "GET", body?: unknown, q = "id=" + id + "&clinicId=" + clinicId) =>
  new Request("https://central.example/api/platform/clinic-contract-draft?" + q, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
it("reads and saves only strict server-confirmed clinic-scoped draft with private cache", async () => {
  const { endpoint, rpc, session } = setup();
  const r = await endpoint(req("PUT", input));
  expect(await r.json()).toEqual({ draft });
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  expect(rpc).toHaveBeenCalledWith(session, "tm_save_clinic_contract_draft", {
    p_draft_id: id,
    p_clinic_id: clinicId,
    p_expected_revision: 0,
    p_document: input.document,
  });
  rpc.mockResolvedValueOnce(null);
  expect(await (await endpoint(req())).json()).toEqual({ draft: null });
});
it("rejects caller identities, mismatched clinic and invalid money before writes", async () => {
  const { endpoint, rpc } = setup();
  for (const bad of [
    { ...input, actor: id },
    { ...input, clinicId: id },
    { ...input, document: { ...input.document, setupCents: 0.2 } },
    { ...input, document: { ...input.document, status: "active" } },
  ])
    expect((await endpoint(req("PUT", bad))).status).toBe(400);
  for (const q of [
    "id=" + id,
    "id=" + id + "&clinicId=" + clinicId + "&userId=" + id,
    "id=" + id + "&clinicId=" + clinicId + "&clinicId=" + clinicId,
  ])
    expect((await endpoint(req("GET", undefined, q))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});
it("requires platform operator, never clinical membership alone", async () => {
  const { endpoint, session, resolveSession, rpc } = setup();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(req())).status).toBe(401);
  session.identity.globalRole = "admin";
  expect((await endpoint(req())).status).toBe(403);
  expect(rpc).not.toHaveBeenCalled();
});
it("treats absent/mismatched write receipts as failure and preserves conflict status", async () => {
  const { endpoint, rpc } = setup();
  for (const bad of [
    null,
    { ...draft, clinicId: id },
    { ...draft, status: "active" },
    { ...draft, revision: 3 },
    { ...draft, document: { ...draft.document, setupCents: 1 } },
  ]) {
    rpc.mockResolvedValueOnce(bad);
    expect((await endpoint(req("PUT", input))).status).toBe(503);
  }
  rpc.mockRejectedValueOnce(new AuthError("Conflict", 409));
  expect((await endpoint(req("PUT", input))).status).toBe(409);
});
it("bounds JSON input without trusting Content-Length", async () => {
  const { endpoint, rpc } = setup();
  expect(
    (
      await endpoint(
        req("PUT", { ...input, document: { ...input.document, notes: "x".repeat(66000) } }),
      )
    ).status,
  ).toBe(413);
  expect(
    (
      await endpoint(
        new Request(
          "https://central.example/api/platform/clinic-contract-draft?id=" +
            id +
            "&clinicId=" +
            clinicId,
          { method: "PUT", body: "{}" },
        ),
      )
    ).status,
  ).toBe(415);
  expect(rpc).not.toHaveBeenCalled();
});
