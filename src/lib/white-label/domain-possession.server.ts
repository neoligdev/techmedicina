import "@tanstack/react-start/server-only";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { reservedDomainSchema } from "@/features/auth/domain-reservations";
import { isLocalOrPreviewHost } from "./host-resolver";

const challengeSchema = z
  .object({
    id: z.string().uuid(),
    domainId: z.string().uuid(),
    clinicId: z.string().uuid(),
    hostname: reservedDomainSchema.shape.hostname,
    environment: reservedDomainSchema.shape.environment,
    revision: z.number().int().positive(),
    token: z.string().regex(/^[a-f0-9]{64}$/),
    createdAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((value) => Date.parse(value.expiresAt) > Date.parse(value.createdAt));
export type DomainChallenge = z.infer<typeof challengeSchema>;
type TxtResolver = (name: string) => Promise<string[][]>;
function authorize(identity: AuthenticatedIdentity) {
  if (identity.globalRole !== "super_admin")
    throw new AuthError("Administrative access denied", 403);
}
function reservation(value: unknown) {
  const result = reservedDomainSchema.parse(value);
  if (
    isIP(result.hostname) ||
    isLocalOrPreviewHost(result.hostname) ||
    !result.hostname.includes(".")
  )
    throw new AuthError("Invalid domain", 400);
  return result;
}
export function domainChallengeRecord(value: DomainChallenge) {
  const challenge = challengeSchema.parse(value);
  if (`_plugpix-verification.${challenge.hostname}`.length > 253)
    throw new AuthError("Invalid verification name", 400);
  return {
    name: `_plugpix-verification.${challenge.hostname}`,
    type: "TXT" as const,
    value: `plugpix-domain-verification=${challenge.token}`,
  };
}
/** Caller must persist this challenge against the reservation/revision before exposing it.
 * Expiry comes from reviewed server policy, not a browser-supplied duration. */
export function issueDomainChallenge(
  identity: AuthenticatedIdentity,
  storedReservation: unknown,
  expiresAt: string,
  now = new Date(),
) {
  authorize(identity);
  const domain = reservation(storedReservation);
  return challengeSchema.parse({
    id: randomUUID(),
    domainId: domain.id,
    clinicId: domain.clinic_id,
    hostname: domain.hostname,
    environment: domain.environment,
    revision: domain.revision,
    token: randomBytes(32).toString("hex"),
    createdAt: now.toISOString(),
    expiresAt,
  });
}
/** Read-only DNS proof, not activation or TLS/routing proof. Both inputs must be
 * loaded by trusted server persistence; no HTTP route accepts client evidence. */
export async function verifyDomainPossession(
  identity: AuthenticatedIdentity,
  storedReservation: unknown,
  storedChallenge: unknown,
  policy: { timeoutMs: number; now?: (() => Date) | undefined },
  lookup: TxtResolver = resolveTxt,
) {
  authorize(identity);
  const domain = reservation(storedReservation),
    challenge = challengeSchema.parse(storedChallenge);
  const now = policy.now ?? (() => new Date());
  if (!Number.isInteger(policy.timeoutMs) || policy.timeoutMs < 1 || policy.timeoutMs > 30000)
    throw new AuthError("Invalid verification policy", 400);
  if (
    challenge.domainId !== domain.id ||
    challenge.clinicId !== domain.clinic_id ||
    challenge.hostname !== domain.hostname ||
    challenge.environment !== domain.environment ||
    challenge.revision !== domain.revision
  )
    throw new AuthError("Domain challenge changed", 409);
  const validAt = (date: Date) =>
    Number.isFinite(date.getTime()) &&
    date.getTime() >= Date.parse(challenge.createdAt) &&
    date.getTime() < Date.parse(challenge.expiresAt);
  if (!validAt(now())) throw new AuthError("Domain challenge expired", 409);
  const record = domainChallengeRecord(challenge);
  // DNS name itself must fit the wire-format hostname length.
  if (record.name.length > 253) throw new AuthError("Invalid verification name", 400);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let records: string[][];
  try {
    records = await Promise.race([
      lookup(record.name),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("DNS deadline")), policy.timeoutMs);
      }),
    ]);
  } catch {
    throw new AuthError("Domain verification unavailable", 503);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
  const checked = now();
  if (!validAt(checked)) throw new AuthError("Domain challenge expired", 409);
  // TXT chunks may concatenate within one record, never across unrelated records.
  const safe = z
    .array(z.array(z.string().max(1024)).max(64))
    .max(256)
    .safeParse(records);
  if (!safe.success || !safe.data.some((chunks) => chunks.join("") === record.value))
    throw new AuthError("Domain possession not confirmed", 409);
  return {
    challengeId: challenge.id,
    domainId: domain.id,
    clinicId: domain.clinic_id,
    hostname: domain.hostname,
    environment: domain.environment,
    revision: domain.revision,
    dnsVerifiedAt: checked.toISOString(),
    expiresAt: challenge.expiresAt,
    proofDigest: createHash("sha256").update(record.value).digest("hex"),
  };
}
