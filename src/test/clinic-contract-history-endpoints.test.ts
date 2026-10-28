// @vitest-environment node
import { it, expect, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { emptyClinicContract } from "@/features/clinic-contracts/contracts";
import { createContractVersionEndpoint } from "@/lib/clinic-contracts/version-endpoint.server";
import { createContractVersionListEndpoint } from "@/lib/clinic-contracts/version-list-endpoint.server";
import { createContractVersionClient } from "@/features/clinic-contracts/version-client";
import { createContractVersionListClient } from "@/features/clinic-contracts/version-list-client";
const id = "11111111-1111-4111-8111-111111111111",
  clinicId = "22222222-2222-4222-8222-222222222222";
const version = {
  draftId: id,
  clinicId,
  revision: 1,
  document: emptyClinicContract(),
  occurredAt: "2026-10-28T10:00:00Z",
};
const page = {
  draftId: id,
  clinicId,
  items: [{ revision: 1, title: "Proposta QA", occurredAt: version.occurredAt }],
  nextCursor: null,
};
function setup() {
  const session = {
    identity: { userId: id, globalRole: "super_admin", links: [] } as AuthenticatedIdentity,
  };
  const resolveSession = vi.fn(async () => session as typeof session | null),
    read = vi.fn(async (): Promise<unknown> => version),
    list = vi.fn(async (): Promise<unknown> => page);
  return {
    session,
    resolveSession,
    read,
    list,
    exact: createContractVersionEndpoint({ resolveSession, read }),
    directory: createContractVersionListEndpoint({ resolveSession, read: list }),
  };
}
const req = (suffix = "&revision=1", method = "GET") =>
  new Request(
    "https://central.example/api/platform/clinic-contract-version?id=" +
      id +
      "&clinicId=" +
      clinicId +
      suffix,
    { method },
  );
it("reads exact scoped historical version and metadata privately without actors", async () => {
  const { exact, directory, read, list, session } = setup();
  const r = await exact(req());
  expect(await r.json()).toEqual({ version });
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  expect(read).toHaveBeenCalledWith(session, {
    p_draft_id: id,
    p_clinic_id: clinicId,
    p_revision: 1,
  });
  expect(await (await directory(req(""))).json()).toEqual({ page });
  expect(list).toHaveBeenCalledWith(session, {
    p_draft_id: id,
    p_clinic_id: clinicId,
    p_limit: 10,
  });
  read.mockResolvedValueOnce(null);
  expect(await (await exact(req())).json()).toEqual({ version: null });
});
it("rejects invalid cursors/duplicate parameters/writes and requires active platform identity", async () => {
  const { exact, directory, resolveSession, session, read, list } = setup();
  for (const suffix of [
    "&revision=0",
    "&revision=1&revision=2",
    "&revision=1&actor=other",
    "&revision=2147483648",
  ])
    expect((await exact(req(suffix))).status).toBe(400);
  for (const suffix of ["&before=0", "&limit=51", "&before=1e1", "&limit=1&limit=2"])
    expect((await directory(req(suffix))).status).toBe(400);
  expect((await exact(req(undefined, "PUT"))).status).toBe(405);
  expect((await directory(req("", "POST"))).status).toBe(405);
  expect(resolveSession).not.toHaveBeenCalled();
  resolveSession.mockResolvedValueOnce(null);
  expect((await exact(req())).status).toBe(401);
  session.identity.globalRole = "admin";
  expect((await directory(req(""))).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
  expect(list).not.toHaveBeenCalled();
});
it("never returns snapshot or metadata from another clinic or malformed revision order", async () => {
  const { exact, directory, read, list } = setup();
  for (const bad of [
    { ...version, clinicId: id },
    { ...version, draftId: clinicId },
    { ...version, revision: 2 },
    { ...version, actor_user_id: id },
  ]) {
    read.mockResolvedValueOnce(bad);
    expect((await exact(req())).status).toBe(503);
  }
  for (const bad of [
    { ...page, clinicId: id },
    { ...page, items: [page.items[0], page.items[0]] },
    { ...page, nextCursor: 1 },
  ]) {
    list.mockResolvedValueOnce(bad);
    expect((await directory(req(""))).status).toBe(503);
  }
});
it("clients validate clinic/revision scope and use bearer/no-store on both reads", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ version }))
    .mockResolvedValueOnce(Response.json({ page }));
  const exact = createContractVersionClient(async () => "qa", fetcher),
    list = createContractVersionListClient(async () => "qa", fetcher);
  expect(await exact({ id, clinicId, revision: 1 })).toEqual(version);
  expect(await list({ id, clinicId })).toEqual(page);
  for (const call of fetcher.mock.calls) {
    expect(String(call[0])).toContain("clinicId=" + clinicId);
    expect(call[1]).toMatchObject({
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      headers: { Authorization: "Bearer qa" },
    });
  }
  fetcher.mockResolvedValueOnce(Response.json({ version: { ...version, clinicId: id } }));
  await expect(exact({ id, clinicId, revision: 1 })).rejects.toThrow();
  fetcher.mockResolvedValueOnce(Response.json({ page: { ...page, clinicId: id } }));
  await expect(list({ id, clinicId })).rejects.toThrow();
  fetcher.mockResolvedValueOnce(Response.json({ page }));
  await expect(list({ id, clinicId, before: 1 })).rejects.toThrow();
});
