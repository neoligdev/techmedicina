import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { dnsProofSchema } from "./domain-dns-persistence.server";
const receiptSchema = z
  .object({
    proof: dnsProofSchema,
    recordedAt: z.string().datetime({ offset: true }),
    recordedBy: z.string().uuid(),
    isCurrent: z.boolean(),
    isValid: z.boolean(),
  })
  .strict()
  .refine((value) => !value.isValid || value.isCurrent)
  .refine((value) => Date.parse(value.recordedAt) >= Date.parse(value.proof.dnsVerifiedAt));
export function createDnsReceiptReader(
  read: (
    identity: AuthenticatedIdentity,
    domainId: string,
    challengeId: string,
  ) => Promise<unknown>,
  now = () => new Date(),
) {
  return async (identity: AuthenticatedIdentity, domainId: string, challengeId: string) => {
    if (identity.globalRole !== "super_admin")
      throw new AuthError("Administrative access denied", 403);
    if (
      !z.string().uuid().safeParse(domainId).success ||
      !z.string().uuid().safeParse(challengeId).success
    )
      throw new AuthError("Invalid domain proof request", 400);
    let raw: unknown;
    try {
      raw = await read(identity, domainId, challengeId);
    } catch {
      throw new AuthError("Domain proof unavailable", 503);
    }
    if (raw === null) return null;
    const saved = receiptSchema.safeParse(raw);
    if (
      !saved.success ||
      saved.data.proof.domainId !== domainId ||
      saved.data.proof.challengeId !== challengeId
    )
      throw new AuthError("Invalid stored domain proof", 503);
    const instant = now().getTime();
    return {
      ...saved.data,
      isValid:
        saved.data.isValid &&
        Number.isFinite(instant) &&
        instant >= Date.parse(saved.data.proof.dnsVerifiedAt) &&
        instant < Date.parse(saved.data.proof.expiresAt),
    };
  };
}
