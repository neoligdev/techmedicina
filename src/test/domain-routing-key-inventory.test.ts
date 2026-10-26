// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createRoutingKeyInventoryReader } from "@/lib/white-label/domain-routing-key-inventory.server";
const actor = "11111111-1111-4111-8111-111111111111",
  project = "22222222-2222-4222-8222-222222222222";
const identity = { userId: actor, globalRole: "super_admin" as const, links: [] };
const key = {
  keyId: "A",
  revision: 1,
  publicKeyDigest: "a".repeat(64),
  isActive: true,
  notBefore: "2026-10-01T00:00:00Z",
  notAfter: "2027-10-01T00:00:00Z",
  revokedAt: null,
  revokedBy: null,
};
it("reads exact project metadata using verified identity and default bound", async () => {
  const read = vi.fn(async () => ({ projectId: project, keys: [key] }));
  expect(
    (await createRoutingKeyInventoryReader(read)(identity, { projectId: project })).keys,
  ).toEqual([key]);
  expect(read).toHaveBeenCalledWith(identity, { projectId: project, limit: 25 });
});
it("rejects caller-supplied identity and unbounded or malformed queries", async () => {
  const read = vi.fn();
  const run = createRoutingKeyInventoryReader(read);
  await expect(run({ userId: actor, links: [] }, { projectId: project })).rejects.toMatchObject({
    status: 403,
  });
  for (const input of [
    { projectId: project, actor },
    { projectId: project, limit: 0 },
    { projectId: project, after: "../" },
  ])
    await expect(run(identity, input)).rejects.toMatchObject({ status: 400 });
  expect(read).not.toHaveBeenCalled();
});
it("rejects foreign project, key material, invalid lifecycle and unordered/repeated pages", async () => {
  for (const page of [
    { projectId: actor, keys: [] },
    { projectId: project, keys: [{ ...key, privateKey: "secret" }] },
    { projectId: project, keys: [{ ...key, revokedAt: key.notBefore, revokedBy: actor }] },
    { projectId: project, keys: [{ ...key, notAfter: key.notBefore }] },
    { projectId: project, keys: [key, key] },
    { projectId: project, keys: [{ ...key, keyId: "z" }, key] },
  ])
    await expect(
      createRoutingKeyInventoryReader(async () => page)(identity, { projectId: project }),
    ).rejects.toMatchObject({ status: 503 });
  await expect(
    createRoutingKeyInventoryReader(async () => ({ projectId: project, keys: [key] }))(identity, {
      projectId: project,
      after: "A",
    }),
  ).rejects.toMatchObject({ status: 503 });
});
it.each([
  ["42501", 403],
  ["22023", 400],
  ["unknown", 503],
] as const)("maps %s without internal diagnostics", async (code, status) => {
  await expect(
    createRoutingKeyInventoryReader(async () => {
      throw { code, message: "private" };
    })(identity, { projectId: project }),
  ).rejects.toMatchObject({ status });
});
