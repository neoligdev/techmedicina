// @vitest-environment node
import { generateKeyPairSync } from "node:crypto";
import { expect, it, vi } from "vitest";
import {
  issueRoutingChallenge,
  signRoutingChallenge,
  verifyRoutingResponse,
  verifyDomainRouting,
  type RoutingKey,
} from "@/lib/white-label/domain-routing-proof.server";
const operator = "11111111-1111-4111-8111-111111111111";
const clinic = "22222222-2222-4222-8222-222222222222";
const project = "33333333-3333-4333-8333-333333333333";
const dnsId = "44444444-4444-4444-8444-444444444444";
const identity = { userId: operator, globalRole: "super_admin" as const, links: [] };
const domain = {
  id: operator,
  clinic_id: clinic,
  hostname: "portal.example.com",
  environment: "clinic_portal",
  status: "pending_verification",
  revision: 2,
  created_at: "2026-10-20T00:00:00Z",
};
const dns = {
  proof: {
    challengeId: dnsId,
    domainId: operator,
    clinicId: clinic,
    hostname: domain.hostname,
    environment: domain.environment,
    revision: 2,
    dnsVerifiedAt: "2026-10-21T09:00:00Z",
    expiresAt: "2026-10-21T12:00:00Z",
    proofDigest: "a".repeat(64),
  },
  recordedAt: "2026-10-21T09:00:01Z",
  recordedBy: operator,
  isCurrent: true,
  isValid: true,
};
const policy = { projectId: project, keyId: "routing-qa-v1", expiresAt: "2026-10-21T10:30:00Z" };
const now = () => new Date("2026-10-21T10:00:00Z");
function fixture() {
  const keys = generateKeyPairSync("ed25519"); // Ephemeral in memory only, never production credentials.
  const common = {
    keyId: policy.keyId,
    projectId: project,
    isActive: true,
    notBefore: "2026-10-21T00:00:00Z",
    notAfter: "2026-10-22T00:00:00Z",
  };
  const privateKey: RoutingKey = { ...common, key: keys.privateKey },
    publicKey: RoutingKey = { ...common, key: keys.publicKey };
  const challenge = issueRoutingChallenge(identity, domain, dns, policy, now());
  const response = signRoutingChallenge(
    challenge,
    { hostname: domain.hostname, projectId: project },
    privateKey,
    now(),
  );
  return {
    privateKey,
    publicKey,
    challenge,
    response,
    body: Buffer.from(JSON.stringify(response)),
  };
}
it("issues independent random challenges capped by current DNS proof validity", () => {
  const a = fixture().challenge,
    b = fixture().challenge;
  expect(a.nonce).toHaveLength(64);
  expect(a.nonce).not.toBe(b.nonce);
  expect(a.id).not.toBe(b.id);
  expect(a).toMatchObject({
    dnsChallengeId: dnsId,
    dnsProofDigest: dns.proof.proofDigest,
    domainId: domain.id,
    clinicId: clinic,
    projectId: project,
    revision: 2,
  });
  expect(() =>
    issueRoutingChallenge(
      identity,
      domain,
      dns,
      { ...policy, expiresAt: "2026-10-21T13:00:00Z" },
      now(),
    ),
  ).toThrow();
});
it("cryptographically verifies scope and returns a candidate receipt without key/nonce/signature", () => {
  const f = fixture();
  const receipt = verifyRoutingResponse(identity, domain, f.challenge, f.body, f.publicKey, now());
  expect(receipt).toMatchObject({
    challengeId: f.challenge.id,
    domainId: domain.id,
    projectId: project,
    keyId: policy.keyId,
    dnsChallengeId: dnsId,
  });
  expect(receipt.signatureDigest).toHaveLength(64);
  expect(JSON.stringify(receipt)).not.toContain(f.challenge.nonce);
  expect(receipt).not.toHaveProperty("status");
  expect(receipt).not.toHaveProperty("signature");
});
it("ingress refuses central-host relay and different project before signing", () => {
  const f = fixture();
  expect(() =>
    signRoutingChallenge(
      f.challenge,
      { hostname: "central.example.com", projectId: project },
      f.privateKey,
      now(),
    ),
  ).toThrow();
  expect(() =>
    signRoutingChallenge(
      f.challenge,
      { hostname: domain.hostname, projectId: clinic },
      f.privateKey,
      now(),
    ),
  ).toThrow();
});
it.each([
  "domainId",
  "clinicId",
  "hostname",
  "environment",
  "revision",
  "projectId",
  "keyId",
  "nonce",
  "dnsChallengeId",
  "dnsProofDigest",
] as const)("rejects tampered signed %s", (field) => {
  const f = fixture();
  const replacement =
    typeof f.challenge[field] === "number"
      ? 3
      : field === "hostname"
        ? "other.example.com"
        : field === "environment"
          ? "patient_pwa"
          : field === "nonce" || field === "dnsProofDigest"
            ? "b".repeat(64)
            : field === "clinicId"
              ? operator
              : field === "keyId"
                ? "other-key"
                : clinic;
  expect(replacement).not.toEqual(f.challenge[field]);
  const changed = { ...f.response, challenge: { ...f.challenge, [field]: replacement } };
  expect(() =>
    verifyRoutingResponse(
      identity,
      domain,
      f.challenge,
      Buffer.from(JSON.stringify(changed)),
      f.publicKey,
      now(),
    ),
  ).toThrow();
});
it("rejects signature tampering, untrusted public key and algorithm confusion", () => {
  const f = fixture();
  const broken = {
    ...f.response,
    signature: (f.response.signature[0] === "A" ? "B" : "A") + f.response.signature.slice(1),
  };
  expect(() =>
    verifyRoutingResponse(
      identity,
      domain,
      f.challenge,
      Buffer.from(JSON.stringify(broken)),
      f.publicKey,
      now(),
    ),
  ).toThrow();
  const foreign = { ...f.publicKey, key: generateKeyPairSync("ed25519").publicKey };
  expect(() =>
    verifyRoutingResponse(identity, domain, f.challenge, f.body, foreign, now()),
  ).toThrow();
  expect(() =>
    verifyRoutingResponse(
      identity,
      domain,
      f.challenge,
      Buffer.from(JSON.stringify({ ...f.response, algorithm: "none" })),
      f.publicKey,
      now(),
    ),
  ).toThrow();
  expect(() =>
    verifyRoutingResponse(identity, domain, f.challenge, f.body, f.privateKey, now()),
  ).toThrow();
});
it("rejects an older valid signed response after challenge rotation and changed domain revision", () => {
  const f = fixture(),
    rotated = issueRoutingChallenge(identity, domain, dns, policy, now());
  expect(() =>
    verifyRoutingResponse(identity, domain, rotated, f.body, f.publicKey, now()),
  ).toThrow();
  expect(() =>
    verifyRoutingResponse(
      identity,
      { ...domain, revision: 3 },
      f.challenge,
      f.body,
      f.publicKey,
      now(),
    ),
  ).toThrow();
});
it("rejects expired/future response and revoked or incompatible key windows", () => {
  const f = fixture();
  expect(() =>
    verifyRoutingResponse(
      identity,
      domain,
      f.challenge,
      f.body,
      f.publicKey,
      new Date(policy.expiresAt),
    ),
  ).toThrow();
  const future = signRoutingChallenge(
    f.challenge,
    { hostname: domain.hostname, projectId: project },
    f.privateKey,
    new Date("2026-10-21T10:00:01Z"),
  );
  expect(() =>
    verifyRoutingResponse(
      identity,
      domain,
      f.challenge,
      Buffer.from(JSON.stringify(future)),
      f.publicKey,
      now(),
    ),
  ).toThrow();
  for (const invalid of [
    { ...f.publicKey, isActive: false },
    { ...f.publicKey, notAfter: "2026-10-21T10:20:00Z" },
    { ...f.publicKey, notBefore: "2026-10-21T10:01:00Z" },
  ])
    expect(() =>
      verifyRoutingResponse(identity, domain, f.challenge, f.body, invalid, now()),
    ).toThrow();
});
it("requires current exact-tenant DNS receipt and administrative identity", () => {
  for (const changed of [
    { ...dns, isCurrent: false, isValid: false },
    { ...dns, isValid: false },
    { ...dns, proof: { ...dns.proof, clinicId: operator } },
    { ...dns, proof: { ...dns.proof, revision: 3 } },
  ])
    expect(() => issueRoutingChallenge(identity, domain, changed, policy, now())).toThrow();
  expect(() =>
    issueRoutingChallenge({ userId: operator, links: [] }, domain, dns, policy, now()),
  ).toThrow();
});
it("composes pinned HTTPS with real signature verification and trusted key read after network", async () => {
  const f = fixture();
  const readKey = vi.fn(async () => f.publicKey);
  const result = await verifyDomainRouting(
    identity,
    domain,
    f.challenge,
    { timeoutMs: 1000, maxBytes: 4096, now },
    readKey,
    {
      resolve: async () => [{ address: "1.1.1.1", family: 4 }],
      exchange: async () => ({ status: 200, body: f.body, certificateFingerprint: "a".repeat(64) }),
    },
  );
  expect(result).toMatchObject({
    challengeId: f.challenge.id,
    certificateFingerprint: "a".repeat(64),
  });
  expect(readKey).toHaveBeenCalledWith(policy.keyId);
});
it("revoking key or expiring challenge during network prevents a successful observation", async () => {
  const f = fixture();
  let active = true;
  const dependencies = {
    resolve: async () => [{ address: "1.1.1.1", family: 4 }],
    exchange: async () => {
      active = false;
      return { status: 200, body: f.body, certificateFingerprint: "a".repeat(64) };
    },
  };
  await expect(
    verifyDomainRouting(
      identity,
      domain,
      f.challenge,
      { timeoutMs: 1000, maxBytes: 4096, now },
      async () => ({ ...f.publicKey, isActive: active }),
      dependencies,
    ),
  ).rejects.toMatchObject({ status: 503 });
  let clock = now();
  await expect(
    verifyDomainRouting(
      identity,
      domain,
      f.challenge,
      { timeoutMs: 1000, maxBytes: 4096, now: () => clock },
      async () => f.publicKey,
      {
        ...dependencies,
        exchange: async () => {
          clock = new Date(policy.expiresAt);
          return { status: 200, body: f.body, certificateFingerprint: "a".repeat(64) };
        },
      },
    ),
  ).rejects.toMatchObject({ status: 409 });
});
it("rejects malformed/oversized or unrelated JSON without revealing diagnostics", () => {
  const f = fixture();
  for (const body of [
    Buffer.from("not JSON"),
    Buffer.alloc(16385),
    Buffer.from(JSON.stringify({ marker: "copied" })),
  ])
    expect(() =>
      verifyRoutingResponse(identity, domain, f.challenge, body, f.publicKey, now()),
    ).toThrow();
});

it.each([
  { clinic_id: operator },
  { hostname: "other.example.com" },
  { environment: "patient_pwa" },
  { revision: 3 },
])("rejects changed reservation before any DNS or HTTPS exchange: %j", async (changed) => {
  const f = fixture();
  const resolve = vi.fn();
  const exchange = vi.fn();
  const readKey = vi.fn();
  await expect(
    verifyDomainRouting(
      identity,
      { ...domain, ...changed },
      f.challenge,
      { timeoutMs: 1000, maxBytes: 4096, now },
      readKey,
      { resolve, exchange },
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect(resolve).not.toHaveBeenCalled();
  expect(exchange).not.toHaveBeenCalled();
  expect(readKey).not.toHaveBeenCalled();
});

it("rejects non-administrative identity before any network access", async () => {
  const f = fixture();
  const resolve = vi.fn();
  await expect(
    verifyDomainRouting(
      { userId: operator, links: [] },
      domain,
      f.challenge,
      { timeoutMs: 1000, maxBytes: 4096, now },
      vi.fn(),
      { resolve },
    ),
  ).rejects.toMatchObject({ status: 403 });
  expect(resolve).not.toHaveBeenCalled();
});

it("normalizes trusted key lookup failures without leaking provider diagnostics", async () => {
  const f = fixture();
  await expect(
    verifyDomainRouting(
      identity,
      domain,
      f.challenge,
      { timeoutMs: 1000, maxBytes: 4096, now },
      async () => {
        throw new Error("private-provider-detail");
      },
      {
        resolve: async () => [{ address: "1.1.1.1", family: 4 }],
        exchange: async () => ({
          status: 200,
          body: f.body,
          certificateFingerprint: "a".repeat(64),
        }),
      },
    ),
  ).rejects.toMatchObject({ status: 503, message: "Routing verification key unavailable" });
});

it("rejects missing keys and wrong project or key identifiers with a controlled error", () => {
  const f = fixture();
  for (const key of [
    null,
    { ...f.publicKey, key: {} },
    { ...f.publicKey, projectId: clinic },
    { ...f.publicKey, keyId: "rotated-key" },
  ]) {
    expect(() =>
      verifyRoutingResponse(identity, domain, f.challenge, f.body, key as RoutingKey, now()),
    ).toThrow("Routing verification key unavailable");
  }
});
