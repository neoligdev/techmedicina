// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createRoutingKeyRevoker } from "@/lib/white-label/domain-routing-key-revocation.server";
const actor = "11111111-1111-4111-8111-111111111111",
  project = "22222222-2222-4222-8222-222222222222";
const identity = { userId: actor, globalRole: "super_admin" as const, links: [] };
const input = { projectId: project, keyId: "qa-key", expectedRevision: 1 };
const saved = {
  projectId: project,
  keyId: "qa-key",
  revision: 2,
  isActive: false,
  revokedAt: "2026-10-21T10:00:00Z",
  revokedBy: actor,
  changed: true,
};
it("passes verified identity to a private writer and accepts the exact persisted receipt", async () => {
  const writer = vi.fn(async () => saved);
  expect(await createRoutingKeyRevoker(writer)(identity, input)).toEqual(saved);
  expect(writer).toHaveBeenCalledWith(identity, input);
});
it("denies unauthorized identity and malformed/client-selected actor before any writer", async () => {
  const writer = vi.fn();
  const revoke = createRoutingKeyRevoker(writer);
  await expect(revoke({ userId: actor, links: [] }, input)).rejects.toMatchObject({ status: 403 });
  for (const invalid of [
    { ...input, actor },
    { ...input, expectedRevision: 0 },
    { ...input, keyId: "../key" },
  ])
    await expect(revoke(identity, invalid)).rejects.toMatchObject({ status: 400 });
  expect(writer).not.toHaveBeenCalled();
});
it("requires exact project/key/revision/actor for changed receipts", async () => {
  for (const wrong of [
    { ...saved, projectId: actor },
    { ...saved, keyId: "other" },
    { ...saved, revision: 3 },
    { ...saved, revokedBy: project },
    { ...saved, isActive: true },
  ])
    await expect(createRoutingKeyRevoker(async () => wrong)(identity, input)).rejects.toMatchObject(
      { status: 503 },
    );
  expect(
    await createRoutingKeyRevoker(async () => ({ ...saved, changed: false, revokedBy: project }))(
      identity,
      { ...input, expectedRevision: 2 },
    ),
  ).toMatchObject({ changed: false, revokedBy: project });
});
it.each([
  ["40001", 409],
  ["42501", 403],
  ["unknown", 503],
] as const)("maps storage code %s without exposing diagnostics", async (code, status) => {
  await expect(
    createRoutingKeyRevoker(async () => {
      throw { code, message: "private details" };
    })(identity, input),
  ).rejects.toMatchObject({ status });
});
