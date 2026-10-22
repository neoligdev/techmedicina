// @vitest-environment node
import { expect, it, vi } from "vitest";
import {
  createRoutingChallengeReader,
  createRoutingReceiptReader,
} from "@/lib/white-label/domain-routing-read.server";
const domainId = "11111111-1111-4111-8111-111111111111",
  challengeId = "22222222-2222-4222-8222-222222222222";
const clinicId = "33333333-3333-4333-8333-333333333333";
const identity = { userId: domainId, globalRole: "super_admin" as const, links: [] };
const domain = {
  id: domainId,
  clinic_id: clinicId,
  hostname: "portal.example.com",
  environment: "clinic_portal",
  revision: 2,
  status: "pending_verification",
  created_at: "2026-10-22T08:00:00Z",
};
const challenge = {
  id: challengeId,
  domainId,
  clinicId,
  hostname: domain.hostname,
  environment: domain.environment,
  revision: 2,
  projectId: domainId,
  keyId: "qa-key",
  nonce: "a".repeat(64),
  dnsChallengeId: clinicId,
  dnsProofDigest: "b".repeat(64),
  createdAt: "2026-10-22T09:00:00Z",
  expiresAt: "2026-10-22T10:00:00Z",
};
const receipt = {
  challengeId,
  domainId,
  clinicId,
  hostname: domain.hostname,
  environment: domain.environment,
  revision: 2,
  projectId: domainId,
  keyId: "qa-key",
  dnsChallengeId: clinicId,
  dnsProofDigest: "b".repeat(64),
  routingVerifiedAt: "2026-10-22T09:01:00Z",
  expiresAt: challenge.expiresAt,
  signatureDigest: "c".repeat(64),
  publicKeyDigest: "d".repeat(64),
  certificateFingerprint: "e".repeat(64),
};
const saved = {
  receipt,
  recordedAt: "2026-10-22T09:01:01Z",
  recordedBy: domainId,
  isCurrent: true,
  isValid: true,
};
const now = () => new Date("2026-10-22T09:30:00Z");
it("validates challenge scope and returns stored state without any network or writer", async () => {
  const state = { domain, challenge },
    read = vi.fn(async () => state);
  expect(await createRoutingChallengeReader(read, now)(identity, domainId)).toEqual(state);
  expect(read).toHaveBeenCalledWith(identity, domainId);
  expect(await createRoutingChallengeReader(async () => null, now)(identity, domainId)).toBeNull();
});
it.each(["clinicId", "domainId", "hostname", "environment", "revision"] as const)(
  "rejects challenge with inconsistent %s",
  async (field) => {
    const value =
      field === "revision"
        ? 3
        : field === "environment"
          ? "patient_pwa"
          : field === "hostname"
            ? "other.example.com"
            : challengeId;
    await expect(
      createRoutingChallengeReader(
        async () => ({ domain, challenge: { ...challenge, [field]: value } }),
        now,
      )(identity, domainId),
    ).rejects.toMatchObject({ status: 503 });
  },
);
it("rechecks challenge expiry and a valid clock at response time", async () => {
  for (const instant of [
    new Date(challenge.expiresAt),
    new Date("2026-10-22T08:00:00Z"),
    new Date(NaN),
  ])
    expect(
      await createRoutingChallengeReader(
        async () => ({ domain, challenge }),
        () => instant,
      )(identity, domainId),
    ).toBeNull();
});
it("returns historical receipt, recalculating expiration without overstating validity", async () => {
  expect(
    await createRoutingReceiptReader(async () => saved, now)(identity, domainId, challengeId),
  ).toEqual(saved);
  expect(
    await createRoutingReceiptReader(
      async () => saved,
      () => new Date(challenge.expiresAt),
    )(identity, domainId, challengeId),
  ).toMatchObject({ isValid: false });
  expect(
    await createRoutingReceiptReader(async () => ({ ...saved, isValid: false }), now)(
      identity,
      domainId,
      challengeId,
    ),
  ).toMatchObject({ isValid: false });
  expect(
    await createRoutingReceiptReader(async () => null, now)(identity, domainId, challengeId),
  ).toBeNull();
});
it("rejects wrong domain/challenge, inconsistent flags and recording before verification", async () => {
  for (const invalid of [
    { ...saved, receipt: { ...receipt, domainId: clinicId } },
    { ...saved, receipt: { ...receipt, challengeId: clinicId } },
    { ...saved, isCurrent: false },
    { ...saved, recordedAt: "2026-10-22T09:00:00Z" },
  ])
    await expect(
      createRoutingReceiptReader(async () => invalid, now)(identity, domainId, challengeId),
    ).rejects.toMatchObject({ status: 503 });
});
it("denies invalid identity and IDs before touching a reader", async () => {
  const read = vi.fn(),
    getChallenge = createRoutingChallengeReader(read),
    getReceipt = createRoutingReceiptReader(read);
  await expect(getChallenge({ userId: domainId, links: [] }, domainId)).rejects.toMatchObject({
    status: 403,
  });
  await expect(getChallenge(identity, "bad")).rejects.toMatchObject({ status: 400 });
  await expect(
    getReceipt({ userId: domainId, links: [] }, domainId, challengeId),
  ).rejects.toMatchObject({ status: 403 });
  await expect(getReceipt(identity, domainId, "bad")).rejects.toMatchObject({ status: 400 });
  expect(read).not.toHaveBeenCalled();
});
it("sanitizes storage diagnostics", async () => {
  const read = async () => {
    throw new Error("private-provider-detail");
  };
  await expect(createRoutingChallengeReader(read)(identity, domainId)).rejects.toMatchObject({
    status: 503,
    message: "Routing challenge unavailable",
  });
  await expect(
    createRoutingReceiptReader(read)(identity, domainId, challengeId),
  ).rejects.toMatchObject({ status: 503, message: "Routing receipt unavailable" });
});
