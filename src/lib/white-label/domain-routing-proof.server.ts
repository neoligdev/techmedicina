import "@tanstack/react-start/server-only";
import { randomBytes, randomUUID, sign, verify, createHash, KeyObject } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { reservedDomainSchema } from "@/features/auth/domain-reservations";
import { domainDnsReceiptSchema } from "./domain-dns-receipt.server";
import { isLocalOrPreviewHost, normalizeHost } from "./host-resolver";
import { probeDomainHttps } from "./domain-https-probe.server";

const keyIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
export const routingChallengeSchema = z
  .object({
    id: z.string().uuid(),
    nonce: z.string().regex(/^[a-f0-9]{64}$/),
    projectId: z.string().uuid(),
    keyId: keyIdSchema,
    domainId: z.string().uuid(),
    clinicId: z.string().uuid(),
    hostname: reservedDomainSchema.shape.hostname,
    environment: reservedDomainSchema.shape.environment,
    revision: z.number().int().positive(),
    dnsChallengeId: z.string().uuid(),
    dnsProofDigest: z.string().regex(/^[a-f0-9]{64}$/),
    createdAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((c) => Date.parse(c.expiresAt) > Date.parse(c.createdAt));
export type RoutingChallenge = z.infer<typeof routingChallengeSchema>;
export type RoutingKey = {
  keyId: string;
  projectId: string;
  key: KeyObject;
  isActive: boolean;
  notBefore: string;
  notAfter: string;
};
const responseSchema = z
  .object({
    version: z.literal(1),
    algorithm: z.literal("Ed25519"),
    challenge: routingChallengeSchema,
    servedAt: z.string().datetime({ offset: true }),
    signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
  })
  .strict();
function admin(identity: AuthenticatedIdentity) {
  if (identity.globalRole !== "super_admin")
    throw new AuthError("Administrative access denied", 403);
}
function domainValue(value: unknown) {
  const domain = reservedDomainSchema.parse(value);
  if (isIP(domain.hostname) || isLocalOrPreviewHost(domain.hostname))
    throw new AuthError("Invalid routing domain", 400);
  return domain;
}
function scope(domain: ReturnType<typeof domainValue>, challenge: RoutingChallenge) {
  if (
    domain.id !== challenge.domainId ||
    domain.clinic_id !== challenge.clinicId ||
    domain.hostname !== challenge.hostname ||
    domain.environment !== challenge.environment ||
    domain.revision !== challenge.revision
  )
    throw new AuthError("Routing challenge changed", 409);
}
function valid(challenge: RoutingChallenge, now: Date) {
  const time = now.getTime();
  if (
    !Number.isFinite(time) ||
    time < Date.parse(challenge.createdAt) ||
    time >= Date.parse(challenge.expiresAt)
  )
    throw new AuthError("Routing challenge expired", 409);
}
function keyValid(
  key: RoutingKey,
  challenge: RoutingChallenge,
  now: Date,
  type: "private" | "public",
) {
  if (
    !key ||
    typeof key !== "object" ||
    key.isActive !== true ||
    !(key.key instanceof KeyObject) ||
    key.keyId !== challenge.keyId ||
    key.projectId !== challenge.projectId ||
    key.key.type !== type ||
    key.key.asymmetricKeyType !== "ed25519" ||
    !z.string().datetime({ offset: true }).safeParse(key.notBefore).success ||
    !z.string().datetime({ offset: true }).safeParse(key.notAfter).success ||
    Date.parse(key.notBefore) > Date.parse(challenge.createdAt) ||
    Date.parse(key.notAfter) < Date.parse(challenge.expiresAt) ||
    now.getTime() < Date.parse(key.notBefore) ||
    now.getTime() >= Date.parse(key.notAfter)
  )
    throw new AuthError("Routing verification key unavailable", 503);
}
function canonical(c: RoutingChallenge) {
  return [
    c.id,
    c.nonce,
    c.projectId,
    c.keyId,
    c.domainId,
    c.clinicId,
    c.hostname,
    c.environment,
    c.revision,
    c.dnsChallengeId,
    c.dnsProofDigest,
    new Date(c.createdAt).toISOString(),
    new Date(c.expiresAt).toISOString(),
  ];
}
function message(challenge: RoutingChallenge, servedAt: string) {
  return Buffer.from(
    JSON.stringify([
      "PlugPix/Techmedicina/routing/v1",
      "Ed25519",
      canonical(challenge),
      new Date(servedAt).toISOString(),
    ]),
  );
}
/** Draft only: persist the current challenge before exposing its ID to a probe/ingress.
 * Policy and DNS receipt must come from trusted server configuration/storage, never a browser. */
export function issueRoutingChallenge(
  identity: AuthenticatedIdentity,
  storedReservation: unknown,
  storedDnsReceipt: unknown,
  policy: { projectId: string; keyId: string; expiresAt: string },
  now = new Date(),
) {
  admin(identity);
  const domain = domainValue(storedReservation),
    dns = domainDnsReceiptSchema.parse(storedDnsReceipt);
  if (
    !dns.isCurrent ||
    !dns.isValid ||
    dns.proof.domainId !== domain.id ||
    dns.proof.clinicId !== domain.clinic_id ||
    dns.proof.hostname !== domain.hostname ||
    dns.proof.environment !== domain.environment ||
    dns.proof.revision !== domain.revision ||
    now.getTime() < Date.parse(dns.proof.dnsVerifiedAt) ||
    now.getTime() >= Date.parse(dns.proof.expiresAt) ||
    Date.parse(policy.expiresAt) > Date.parse(dns.proof.expiresAt)
  )
    throw new AuthError("Current DNS proof required", 409);
  const challenge = routingChallengeSchema.parse({
    id: randomUUID(),
    nonce: randomBytes(32).toString("hex"),
    projectId: policy.projectId,
    keyId: policy.keyId,
    domainId: domain.id,
    clinicId: domain.clinic_id,
    hostname: domain.hostname,
    environment: domain.environment,
    revision: domain.revision,
    dnsChallengeId: dns.proof.challengeId,
    dnsProofDigest: dns.proof.proofDigest,
    createdAt: now.toISOString(),
    expiresAt: policy.expiresAt,
  });
  valid(challenge, now);
  return challenge;
}
/** Ingress-only: host/project must be established by trusted ingress configuration.
 * Do not derive trustedIngress from JSON, an unchecked Host or forwarded headers. */
export function signRoutingChallenge(
  storedChallenge: unknown,
  trustedIngress: { hostname: string; projectId: string },
  signingKey: RoutingKey,
  now = new Date(),
) {
  const challenge = routingChallengeSchema.parse(storedChallenge);
  valid(challenge, now);
  if (
    trustedIngress.hostname !== challenge.hostname ||
    trustedIngress.projectId !== challenge.projectId ||
    normalizeHost(trustedIngress.hostname).host !== trustedIngress.hostname ||
    isIP(trustedIngress.hostname) ||
    isLocalOrPreviewHost(trustedIngress.hostname)
  )
    throw new AuthError("Routing ingress denied", 403);
  keyValid(signingKey, challenge, now, "private");
  const servedAt = now.toISOString();
  return {
    version: 1 as const,
    algorithm: "Ed25519" as const,
    challenge,
    servedAt,
    signature: sign(null, message(challenge, servedAt), signingKey.key).toString("base64url"),
  };
}
/** Candidate observation only; a later transactional writer must recheck current ID/revision/key. */
export function verifyRoutingResponse(
  identity: AuthenticatedIdentity,
  storedReservation: unknown,
  storedChallenge: unknown,
  body: Buffer,
  verificationKey: RoutingKey,
  now = new Date(),
) {
  admin(identity);
  const domain = domainValue(storedReservation),
    challenge = routingChallengeSchema.parse(storedChallenge);
  scope(domain, challenge);
  valid(challenge, now);
  keyValid(verificationKey, challenge, now, "public");
  if (!Buffer.isBuffer(body) || body.length > 16384)
    throw new AuthError("Invalid routing response", 409);
  let raw: unknown;
  try {
    raw = JSON.parse(body.toString("utf8"));
  } catch {
    throw new AuthError("Invalid routing response", 409);
  }
  const parsed = responseSchema.safeParse(raw);
  if (
    !parsed.success ||
    JSON.stringify(canonical(parsed.data.challenge)) !== JSON.stringify(canonical(challenge)) ||
    Date.parse(parsed.data.servedAt) < Date.parse(challenge.createdAt) ||
    Date.parse(parsed.data.servedAt) > now.getTime()
  )
    throw new AuthError("Routing proof not confirmed", 409);
  const signature = Buffer.from(parsed.data.signature, "base64url");
  if (
    signature.length !== 64 ||
    signature.toString("base64url") !== parsed.data.signature ||
    !verify(null, message(challenge, parsed.data.servedAt), verificationKey.key, signature)
  )
    throw new AuthError("Routing proof not confirmed", 409);
  return {
    challengeId: challenge.id,
    domainId: domain.id,
    clinicId: domain.clinic_id,
    hostname: domain.hostname,
    environment: domain.environment,
    revision: domain.revision,
    projectId: challenge.projectId,
    keyId: challenge.keyId,
    dnsChallengeId: challenge.dnsChallengeId,
    dnsProofDigest: challenge.dnsProofDigest,
    routingVerifiedAt: now.toISOString(),
    expiresAt: challenge.expiresAt,
    publicKeyDigest: createHash("sha256")
      .update(verificationKey.key.export({ format: "der", type: "spki" }))
      .digest("hex"),
    signatureDigest: createHash("sha256").update(signature).digest("hex"),
  };
}
/** No default key, ingress endpoint or privileged connection. Key lookup happens after network
 * so a configured revocation source can reject a key withdrawn while the probe was in flight. */
export async function verifyDomainRouting(
  identity: AuthenticatedIdentity,
  storedReservation: unknown,
  storedChallenge: unknown,
  policy: { timeoutMs: number; maxBytes: number; now?: () => Date },
  readKey: (keyId: string) => Promise<RoutingKey>,
  dependencies?: Parameters<typeof probeDomainHttps>[3],
) {
  admin(identity);
  const domain = domainValue(storedReservation),
    challenge = routingChallengeSchema.parse(storedChallenge),
    now = policy.now ?? (() => new Date());
  scope(domain, challenge);
  valid(challenge, now());
  const observation = await probeDomainHttps(identity, domain, policy, dependencies);
  let key: RoutingKey;
  try {
    key = await readKey(challenge.keyId);
  } catch {
    throw new AuthError("Routing verification key unavailable", 503);
  }
  return {
    ...verifyRoutingResponse(identity, domain, challenge, observation.body, key, now()),
    certificateFingerprint: observation.certificateFingerprint,
  };
}
