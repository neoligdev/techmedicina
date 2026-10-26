import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
const keyId = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const timestamp = z.string().datetime({ offset: true });
const inputSchema = z
  .object({
    projectId: z.string().uuid(),
    after: keyId.optional(),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict();
export type RoutingKeyInventoryInput = z.infer<typeof inputSchema>;
const keySchema = z
  .object({
    keyId,
    revision: z.number().int().positive(),
    publicKeyDigest: z.string().regex(/^[a-f0-9]{64}$/),
    isActive: z.boolean(),
    notBefore: timestamp,
    notAfter: timestamp,
    revokedAt: timestamp.nullable(),
    revokedBy: z.string().uuid().nullable(),
  })
  .strict()
  .refine(
    (k) =>
      Date.parse(k.notAfter) > Date.parse(k.notBefore) &&
      ((k.revokedAt === null && k.revokedBy === null) ||
        (k.revokedAt !== null && k.revokedBy !== null && !k.isActive)),
  );
const pageSchema = z.object({ projectId: z.string().uuid(), keys: z.array(keySchema) }).strict();
/** Private injected reader. Metadata is a snapshot, never authorization to use or reactivate a key. */
export function createRoutingKeyInventoryReader(
  read: (identity: AuthenticatedIdentity, input: RoutingKeyInventoryInput) => Promise<unknown>,
) {
  return async (identity: AuthenticatedIdentity, value: unknown) => {
    if (identity.globalRole !== "super_admin")
      throw new AuthError("Administrative access denied", 403);
    const input = inputSchema.safeParse(value);
    if (!input.success) throw new AuthError("Invalid key inventory request", 400);
    let raw: unknown;
    try {
      raw = await read(identity, input.data);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === "42501") throw new AuthError("Administrative access denied", 403);
      if (code === "22023") throw new AuthError("Invalid key inventory request", 400);
      throw new AuthError("Key inventory unavailable", 503);
    }
    const page = pageSchema.safeParse(raw);
    if (
      !page.success ||
      page.data.projectId !== input.data.projectId ||
      page.data.keys.length > input.data.limit ||
      page.data.keys.some(
        (k, i, keys) => k.keyId <= (i ? keys[i - 1]!.keyId : (input.data.after ?? "")),
      )
    )
      throw new AuthError("Invalid key inventory response", 503);
    return page.data;
  };
}
