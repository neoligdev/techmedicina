import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { reservedDomainSchema } from "@/features/auth/domain-reservations";
import { routingChallengeSchema, verifyDomainRouting } from "./domain-routing-proof.server";

export const routingReceiptSchema = z
  .object({
    challengeId: z.string().uuid(),
    domainId: z.string().uuid(),
    clinicId: z.string().uuid(),
    hostname: reservedDomainSchema.shape.hostname,
    environment: reservedDomainSchema.shape.environment,
    revision: z.number().int().positive(),
    projectId: z.string().uuid(),
    keyId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    dnsChallengeId: z.string().uuid(),
    dnsProofDigest: z.string().regex(/^[a-f0-9]{64}$/),
    routingVerifiedAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
    signatureDigest: z.string().regex(/^[a-f0-9]{64}$/),
    publicKeyDigest: z.string().regex(/^[a-f0-9]{64}$/),
    certificateFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .refine((r) => Date.parse(r.expiresAt) > Date.parse(r.routingVerifiedAt));
export type RoutingReceipt = z.infer<typeof routingReceiptSchema>;
const stateSchema = z
  .object({ domain: reservedDomainSchema, challenge: routingChallengeSchema })
  .strict();
type Dependencies = {
  read: (identity: AuthenticatedIdentity, domainId: string) => Promise<unknown>;
  // PRIVATE trusted worker; SQL must recheck scope/key/DNS and consume atomically.
  record: (identity: AuthenticatedIdentity, receipt: RoutingReceipt) => Promise<unknown>;
  readKey: Parameters<typeof verifyDomainRouting>[4];
};
/** No default privileged client, public endpoint or automatic domain activation. */
export function createPersistedRoutingVerifier(
  deps: Dependencies,
  policy: Parameters<typeof verifyDomainRouting>[3],
  network?: Parameters<typeof verifyDomainRouting>[5],
) {
  return async (identity: AuthenticatedIdentity, domainId: string) => {
    if (identity.globalRole !== "super_admin")
      throw new AuthError("Administrative access denied", 403);
    if (!z.string().uuid().safeParse(domainId).success) throw new AuthError("Invalid domain", 400);
    let raw: unknown;
    try {
      raw = await deps.read(identity, domainId);
    } catch {
      throw new AuthError("Routing challenge unavailable", 503);
    }
    if (raw === null) throw new AuthError("No current routing challenge", 409);
    const parsed = stateSchema.safeParse(raw);
    if (!parsed.success || parsed.data.domain.id !== domainId)
      throw new AuthError("Invalid stored routing challenge", 503);
    const receipt = routingReceiptSchema.parse(
      await verifyDomainRouting(
        identity,
        parsed.data.domain,
        parsed.data.challenge,
        policy,
        deps.readKey,
        network,
      ),
    );
    let saved: unknown;
    try {
      saved = await deps.record(identity, receipt);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        ["40001", "23505"].includes(String(error.code))
      )
        throw new AuthError("Routing challenge changed", 409);
      throw new AuthError("Routing persistence unavailable", 503);
    }
    const checked = routingReceiptSchema.safeParse(saved);
    if (!checked.success) throw new AuthError("Invalid saved routing receipt", 503);
    for (const field of Object.keys(receipt) as (keyof RoutingReceipt)[]) {
      const expected = receipt[field],
        actual = checked.data[field];
      const equal =
        field === "expiresAt" || field === "routingVerifiedAt"
          ? Date.parse(String(expected)) === Date.parse(String(actual))
          : expected === actual;
      if (!equal) throw new AuthError("Invalid saved routing receipt", 503);
    }
    return checked.data;
  };
}
