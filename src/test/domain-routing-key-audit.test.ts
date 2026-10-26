// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createRoutingKeyAuditReader } from "@/lib/white-label/domain-routing-key-audit.server";
const actor = "11111111-1111-4111-8111-111111111111";
const project = "22222222-2222-4222-8222-222222222222";
const identity = { userId: actor, globalRole: "super_admin" as const, links: [] };
const input = { projectId: project, keyId: "qa-key" };
const entry = {
  id: actor,
  actorUserId: actor,
  action: "routing_key_revoked",
  previousRevision: 1,
  revision: 2,
  wasActive: true,
  publicKeyDigest: "a".repeat(64),
  occurredAt: "2026-10-26T10:00:00Z",
};
it("uses a private reader with verified identity and bounded default", async () => {
  const read = vi.fn(async () => ({ ...input, entries: [entry] }));
  expect((await createRoutingKeyAuditReader(read)(identity, input)).entries).toEqual([entry]);
  expect(read).toHaveBeenCalledWith(identity, { ...input, limit: 25 });
});
it("rejects non-administrators and caller-supplied actor before reading", async () => {
  const read = vi.fn();
  const run = createRoutingKeyAuditReader(read);
  await expect(run({ userId: actor, links: [] }, input)).rejects.toMatchObject({ status: 403 });
  for (const value of [
    { ...input, actor },
    { ...input, limit: 101 },
    { ...input, before: "bad" },
  ])
    await expect(run(identity, value)).rejects.toMatchObject({ status: 400 });
  expect(read).not.toHaveBeenCalled();
});
it("rejects foreign scope, duplicate events, cursor repetition, invalid revision and excess payload", async () => {
  for (const page of [
    { ...input, projectId: actor, entries: [] },
    { ...input, entries: [entry, entry] },
    { ...input, entries: [{ ...entry, revision: 4 }] },
    { ...input, entries: [{ ...entry, secret: "hidden" }] },
  ])
    await expect(
      createRoutingKeyAuditReader(async () => page)(identity, input),
    ).rejects.toMatchObject({ status: 503 });
  await expect(
    createRoutingKeyAuditReader(async () => ({ ...input, entries: [entry] }))(identity, {
      ...input,
      before: actor,
    }),
  ).rejects.toMatchObject({ status: 503 });
  await expect(
    createRoutingKeyAuditReader(async () => ({
      ...input,
      entries: [entry, { ...entry, id: project }],
    }))(identity, { ...input, limit: 1 }),
  ).rejects.toMatchObject({ status: 503 });
});
it.each([
  ["42501", 403],
  ["22023", 400],
  ["unknown", 503],
] as const)("maps storage code %s safely", async (code, status) => {
  await expect(
    createRoutingKeyAuditReader(async () => {
      throw { code, message: "private" };
    })(identity, input),
  ).rejects.toMatchObject({ status });
});
