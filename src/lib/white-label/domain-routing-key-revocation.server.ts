import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
export const routingKeyRevocationInputSchema = z
  .object({
    projectId: z.string().uuid(),
    keyId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    expectedRevision: z.number().int().positive(),
  })
  .strict();
export type RoutingKeyRevocationInput = z.infer<typeof routingKeyRevocationInputSchema>;
const receiptSchema = z
  .object({
    projectId: z.string().uuid(),
    keyId: routingKeyRevocationInputSchema.shape.keyId,
    revision: z.number().int().positive(),
    isActive: z.literal(false),
    revokedAt: z.string().datetime({ offset: true }),
    revokedBy: z.string().uuid(),
    changed: z.boolean(),
  })
  .strict();
/** Private worker dependency only: never an authenticated/browser RPC client. No default connection. */
export function createRoutingKeyRevoker(
  revoke: (identity: AuthenticatedIdentity, input: RoutingKeyRevocationInput) => Promise<unknown>,
) {
  return async (identity: AuthenticatedIdentity, value: unknown) => {
    if (identity.globalRole !== "super_admin")
      throw new AuthError("Administrative access denied", 403);
    const input = routingKeyRevocationInputSchema.safeParse(value);
    if (!input.success) throw new AuthError("Invalid key revocation request", 400);
    let raw: unknown;
    try {
      raw = await revoke(identity, input.data);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === "40001") throw new AuthError("Routing key changed", 409);
      if (code === "42501") throw new AuthError("Administrative access denied", 403);
      throw new AuthError("Routing key revocation unavailable", 503);
    }
    const saved = receiptSchema.safeParse(raw);
    if (
      !saved.success ||
      saved.data.projectId !== input.data.projectId ||
      saved.data.keyId !== input.data.keyId ||
      saved.data.revision !== input.data.expectedRevision + (saved.data.changed ? 1 : 0) ||
      (saved.data.changed && saved.data.revokedBy !== identity.userId)
    )
      throw new AuthError("Invalid saved key revocation", 503);
    return saved.data;
  };
}
