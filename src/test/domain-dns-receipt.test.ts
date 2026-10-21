// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createDnsReceiptReader } from "@/lib/white-label/domain-dns-receipt.server";
const domain = "11111111-1111-4111-8111-111111111111",
  challenge = "22222222-2222-4222-8222-222222222222";
const identity = { userId: domain, globalRole: "super_admin" as const, links: [] };
const receipt = {
  proof: {
    domainId: domain,
    challengeId: challenge,
    clinicId: domain,
    hostname: "portal.example.com",
    environment: "clinic_portal",
    revision: 2,
    dnsVerifiedAt: "2026-10-21T08:00:00Z",
    expiresAt: "2026-10-21T09:00:00Z",
    proofDigest: "a".repeat(64),
  },
  recordedAt: "2026-10-21T08:00:01Z",
  recordedBy: domain,
  isCurrent: true,
  isValid: true,
};
it("reads committed receipt without any DNS call and recalculates expiry at response time", async () => {
  const read = vi.fn(async () => receipt);
  expect(
    await createDnsReceiptReader(read, () => new Date("2026-10-21T08:30:00Z"))(
      identity,
      domain,
      challenge,
    ),
  ).toEqual(receipt);
  expect(
    await createDnsReceiptReader(read, () => new Date("2026-10-21T09:00:00Z"))(
      identity,
      domain,
      challenge,
    ),
  ).toMatchObject({ isValid: false });
  expect(read).toHaveBeenCalledWith(identity, domain, challenge);
});
it("denies ordinary identity and invalid ids before database access", async () => {
  const read = vi.fn();
  const get = createDnsReceiptReader(read);
  await expect(get({ userId: domain, links: [] }, domain, challenge)).rejects.toMatchObject({
    status: 403,
  });
  await expect(get(identity, "bad", challenge)).rejects.toMatchObject({ status: 400 });
  expect(read).not.toHaveBeenCalled();
});
it("rejects a receipt for another domain/challenge and inconsistent validity flags", async () => {
  for (const wrong of [
    { ...receipt, proof: { ...receipt.proof, domainId: challenge } },
    { ...receipt, proof: { ...receipt.proof, challengeId: domain } },
    { ...receipt, isCurrent: false, isValid: true },
  ]) {
    await expect(
      createDnsReceiptReader(async () => wrong)(identity, domain, challenge),
    ).rejects.toMatchObject({ status: 503 });
  }
});
it("unknown proof is null and storage errors are sanitized", async () => {
  expect(await createDnsReceiptReader(async () => null)(identity, domain, challenge)).toBeNull();
  await expect(
    createDnsReceiptReader(async () => {
      throw new Error("private diagnostic");
    })(identity, domain, challenge),
  ).rejects.toMatchObject({ status: 503, message: "Domain proof unavailable" });
});
