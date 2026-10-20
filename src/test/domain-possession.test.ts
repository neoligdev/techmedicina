// @vitest-environment node
import { expect, it, vi } from "vitest";
import {
  issueDomainChallenge,
  domainChallengeRecord,
  verifyDomainPossession,
} from "@/lib/white-label/domain-possession.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
const operator: AuthenticatedIdentity = {
  userId: "11111111-1111-4111-8111-111111111111",
  globalRole: "super_admin",
  links: [],
};
const domain = {
  id: operator.userId,
  clinic_id: "22222222-2222-4222-8222-222222222222",
  hostname: "portal.qa.example.com",
  environment: "clinic_portal",
  status: "pending_verification",
  revision: 1,
  created_at: "2026-10-20T00:00:00Z",
};
const now = () => new Date("2026-10-20T01:00:00Z");
const policy = { timeoutMs: 1000, now };
function challenge() {
  return issueDomainChallenge(operator, domain, "2026-10-20T02:00:00Z", now());
}
it("issues independent random challenges bound to exact domain revision", () => {
  const a = challenge(),
    b = challenge();
  expect(a.token).toHaveLength(64);
  expect(a.token).not.toBe(b.token);
  expect(a.id).not.toBe(b.id);
  expect(domainChallengeRecord(a).name).toBe("_plugpix-verification.portal.qa.example.com");
});
it("verifies exact TXT with chunks in one record; receipt never activates a domain", async () => {
  const proof = challenge(),
    value = domainChallengeRecord(proof).value;
  const lookup = vi.fn(async () => [[value.slice(0, 30), value.slice(30)]]);
  const receipt = await verifyDomainPossession(operator, domain, proof, policy, lookup);
  expect(lookup).toHaveBeenCalledWith("_plugpix-verification.portal.qa.example.com");
  expect(receipt).toMatchObject({
    domainId: domain.id,
    revision: 1,
    dnsVerifiedAt: now().toISOString(),
  });
  expect(JSON.stringify(receipt)).not.toContain(proof.token);
  expect(receipt).not.toHaveProperty("status");
});
it("cannot assemble separate TXT records or accept partial/foreign proof", async () => {
  const proof = challenge(),
    value = domainChallengeRecord(proof).value;
  for (const records of [
    [[value.slice(0, 30)], [value.slice(30)]],
    [[value + "suffix"]],
    [[domainChallengeRecord(challenge()).value]],
    [],
  ]) {
    await expect(
      verifyDomainPossession(operator, domain, proof, policy, async () => records),
    ).rejects.toMatchObject({ status: 409 });
  }
});
it.each(["clinic_id", "hostname", "environment", "revision"])(
  "rejects changed %s before DNS",
  async (key) => {
    const changed = {
      ...domain,
      [key]:
        key === "revision"
          ? 2
          : key === "environment"
            ? "patient_pwa"
            : key === "hostname"
              ? "other.example.com"
              : operator.userId,
    };
    const lookup = vi.fn();
    await expect(
      verifyDomainPossession(operator, changed, challenge(), policy, lookup),
    ).rejects.toMatchObject({ status: 409 });
    expect(lookup).not.toHaveBeenCalled();
  },
);
it("requires operator identity and rejects local/IP hosts", async () => {
  const denied = { ...operator, globalRole: undefined } as unknown as AuthenticatedIdentity;
  const lookup = vi.fn();
  await expect(
    verifyDomainPossession(denied, domain, challenge(), policy, lookup),
  ).rejects.toMatchObject({ status: 403 });
  expect(lookup).not.toHaveBeenCalled();
  expect(() =>
    issueDomainChallenge(
      operator,
      { ...domain, hostname: "127.0.0.1" },
      "2026-10-20T02:00:00Z",
      now(),
    ),
  ).toThrow();
});
it("rechecks expiration after DNS and hides resolver failures", async () => {
  const proof = challenge(),
    value = domainChallengeRecord(proof).value;
  const clock = vi.fn().mockReturnValueOnce(now()).mockReturnValueOnce(new Date(proof.expiresAt));
  await expect(
    verifyDomainPossession(operator, domain, proof, { ...policy, now: clock }, async () => [
      [value],
    ]),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    verifyDomainPossession(operator, domain, proof, policy, async () => {
      throw new Error("private diagnostics");
    }),
  ).rejects.toMatchObject({ status: 503, message: "Domain verification unavailable" });
});

it("bounds a nonresponding resolver and rejects expired challenges before lookup", async () => {
  await expect(
    verifyDomainPossession(
      operator,
      domain,
      challenge(),
      { ...policy, timeoutMs: 10 },
      () => new Promise(() => {}),
    ),
  ).rejects.toMatchObject({ status: 503 });
  const lookup = vi.fn();
  await expect(
    verifyDomainPossession(
      operator,
      domain,
      challenge(),
      { ...policy, now: () => new Date("2026-10-20T03:00:00Z") },
      lookup,
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect(lookup).not.toHaveBeenCalled();
});
