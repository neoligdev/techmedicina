import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { domainReservationInputSchema } from "@/features/auth/domain-reservations";
const inputSchema = z
  .object({
    domainId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
    projectId: z.string().uuid(),
    challengeId: z.string().uuid(),
  })
  .strict();
export type DomainActivationInput = z.infer<typeof inputSchema>;
const receiptSchema = z
  .object({
    domainId: z.string().uuid(),
    clinicId: z.string().uuid(),
    hostname: domainReservationInputSchema.shape.hostname,
    environment: domainReservationInputSchema.shape.environment,
    projectId: z.string().uuid(),
    challengeId: z.string().uuid(),
    status: z.literal("active"),
    revision: z.number().int().positive(),
    activatedAt: z.string().datetime({ offset: true }),
    validUntil: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((r) => Date.parse(r.validUntil) > Date.parse(r.activatedAt));
/** Local private write contract; no public endpoint, default connection or automatic activation. */
export function createDomainActivator(
  write: (identity: AuthenticatedIdentity, input: DomainActivationInput) => Promise<unknown>,
) {
  return async (identity: AuthenticatedIdentity, value: unknown) => {
    if (identity.globalRole !== "super_admin")
      throw new AuthError("Administrative access denied", 403);
    const input = inputSchema.safeParse(value);
    if (!input.success) throw new AuthError("Invalid activation request", 400);
    let raw: unknown;
    try {
      raw = await write(identity, input.data);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === "42501") throw new AuthError("Administrative access denied", 403);
      if (code === "40001" || code === "23505") throw new AuthError("Domain proof changed", 409);
      throw new AuthError("Domain activation unavailable", 503);
    }
    const receipt = receiptSchema.safeParse(raw);
    if (
      !receipt.success ||
      receipt.data.domainId !== input.data.domainId ||
      receipt.data.projectId !== input.data.projectId ||
      receipt.data.challengeId !== input.data.challengeId ||
      receipt.data.revision !== input.data.expectedRevision + 1
    )
      throw new AuthError("Invalid activation receipt", 503);
    return receipt.data;
  };
}
