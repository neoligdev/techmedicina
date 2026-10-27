// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createDomainActivator } from "@/lib/white-label/domain-activation.server";
const actor = "11111111-1111-4111-8111-111111111111",
  project = "22222222-2222-4222-8222-222222222222";
const identity = { userId: actor, globalRole: "super_admin" as const, links: [] };
const input = { domainId: actor, expectedRevision: 2, projectId: project, challengeId: project };
const saved = {
  domainId: actor,
  clinicId: project,
  hostname: "qa.example.com",
  environment: "patient_pwa",
  projectId: project,
  challengeId: project,
  status: "active",
  revision: 3,
  activatedAt: "2026-10-26T10:00:00Z",
  validUntil: "2026-10-26T11:00:00Z",
};
it("forwards verified actor and accepts exact activation receipt", async () => {
  const write = vi.fn(async () => saved);
  expect(await createDomainActivator(write)(identity, input)).toEqual(saved);
  expect(write).toHaveBeenCalledWith(identity, input);
});
it("rejects caller identity, proof flags and unauthorized access before storage", async () => {
  const write = vi.fn();
  const run = createDomainActivator(write);
  await expect(run({ userId: actor, links: [] }, input)).rejects.toMatchObject({ status: 403 });
  for (const value of [
    { ...input, actor },
    { ...input, isVerified: true },
    { ...input, expectedRevision: 0 },
  ])
    await expect(run(identity, value)).rejects.toMatchObject({ status: 400 });
  expect(write).not.toHaveBeenCalled();
});
it("rejects mismatched scope, revision, invalid validity and non-active result", async () => {
  for (const receipt of [
    { ...saved, domainId: project },
    { ...saved, projectId: actor },
    { ...saved, challengeId: actor },
    { ...saved, revision: 2 },
    { ...saved, validUntil: saved.activatedAt },
    { ...saved, status: "pending_verification" },
  ])
    await expect(createDomainActivator(async () => receipt)(identity, input)).rejects.toMatchObject(
      { status: 503 },
    );
});
it.each([
  ["42501", 403],
  ["40001", 409],
  ["23505", 409],
  ["unknown", 503],
] as const)("maps %s safely", async (code, status) => {
  await expect(
    createDomainActivator(async () => {
      throw { code, message: "private" };
    })(identity, input),
  ).rejects.toMatchObject({ status });
});
