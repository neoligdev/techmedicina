import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { reservedDomainSchema } from "@/features/auth/domain-reservations";
import { challengeSchema, verifyDomainPossession } from "./domain-possession.server";

export const dnsProofSchema = z
  .object({
    challengeId: z.string().uuid(),
    domainId: z.string().uuid(),
    clinicId: z.string().uuid(),
    hostname: reservedDomainSchema.shape.hostname,
    environment: reservedDomainSchema.shape.environment,
    revision: z.number().int().positive(),
    dnsVerifiedAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
    proofDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type DnsProof = z.infer<typeof dnsProofSchema>;
const stateSchema = z.object({ domain: reservedDomainSchema, challenge: challengeSchema }).strict();
type Dependencies = {
  // Authenticated read RPC, never browser-supplied reservation/challenge objects.
  read: (identity: AuthenticatedIdentity, domainId: string) => Promise<unknown>;
  // Trusted private writer only; do not use an authenticated/anonymous browser client.
  record: (identity: AuthenticatedIdentity, proof: DnsProof) => Promise<unknown>;
};
/** No endpoint or default privileged connection: deployment requires a reviewed worker identity.
 * The database must compare current revision/challenge and consume it atomically after DNS. */
export function createPersistedDnsVerifier(
  dependencies: Dependencies,
  policy: Parameters<typeof verifyDomainPossession>[3],
  lookup?: Parameters<typeof verifyDomainPossession>[4],
) {
  return async (identity: AuthenticatedIdentity, domainId: string) => {
    if (identity.globalRole !== "super_admin")
      throw new AuthError("Administrative access denied", 403);
    const id = z.string().uuid().safeParse(domainId);
    if (!id.success) throw new AuthError("Invalid domain", 400);
    let raw: unknown;
    try {
      raw = await dependencies.read(identity, id.data);
    } catch {
      throw new AuthError("Domain challenge unavailable", 503);
    }
    if (raw === null) throw new AuthError("No current domain challenge", 409);
    const state = stateSchema.safeParse(raw);
    if (!state.success || state.data.domain.id !== id.data)
      throw new AuthError("Invalid stored domain challenge", 503);
    const proof = await verifyDomainPossession(
      identity,
      state.data.domain,
      state.data.challenge,
      policy,
      lookup,
    );
    let result: unknown;
    try {
      result = await dependencies.record(identity, proof);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "40001")
        throw new AuthError("Domain challenge changed", 409);
      throw new AuthError("Domain proof persistence unavailable", 503);
    }
    const saved = dnsProofSchema.safeParse(result);
    if (!saved.success) throw new AuthError("Invalid saved domain proof", 503);
    for (const field of [
      "challengeId",
      "domainId",
      "clinicId",
      "hostname",
      "environment",
      "revision",
      "proofDigest",
    ] as const)
      if (saved.data[field] !== proof[field])
        throw new AuthError("Invalid saved domain proof", 503);
    if (
      Date.parse(saved.data.dnsVerifiedAt) !== Date.parse(proof.dnsVerifiedAt) ||
      Date.parse(saved.data.expiresAt) !== Date.parse(proof.expiresAt)
    )
      throw new AuthError("Invalid saved domain proof", 503);
    return saved.data;
  };
}
