import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
const inputSchema = z
  .object({
    projectId: z.string().uuid(),
    keyId: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    before: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict();
export type RoutingKeyAuditInput = z.infer<typeof inputSchema>;
const entrySchema = z
  .object({
    id: z.string().uuid(),
    actorUserId: z.string().uuid(),
    action: z.literal("routing_key_revoked"),
    previousRevision: z.number().int().positive(),
    revision: z.number().int().positive(),
    wasActive: z.boolean(),
    publicKeyDigest: z.string().regex(/^[a-f0-9]{64}$/),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((entry) => entry.revision === entry.previousRevision + 1);
const pageSchema = z
  .object({
    projectId: z.string().uuid(),
    keyId: inputSchema.shape.keyId,
    entries: z.array(entrySchema),
  })
  .strict();
/** Private injected reader only. No default privileged connection or browser RPC. */
export function createRoutingKeyAuditReader(
  read: (identity: AuthenticatedIdentity, input: RoutingKeyAuditInput) => Promise<unknown>,
) {
  return async (identity: AuthenticatedIdentity, value: unknown) => {
    if (identity.globalRole !== "super_admin")
      throw new AuthError("Administrative access denied", 403);
    const input = inputSchema.safeParse(value);
    if (!input.success) throw new AuthError("Invalid key audit request", 400);
    let raw: unknown;
    try {
      raw = await read(identity, input.data);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === "42501") throw new AuthError("Administrative access denied", 403);
      if (code === "22023") throw new AuthError("Invalid key audit request", 400);
      throw new AuthError("Key audit unavailable", 503);
    }
    const page = pageSchema.safeParse(raw);
    if (
      !page.success ||
      page.data.projectId !== input.data.projectId ||
      page.data.keyId !== input.data.keyId ||
      page.data.entries.length > input.data.limit ||
      new Set(page.data.entries.map((entry) => entry.id)).size !== page.data.entries.length ||
      page.data.entries.some((entry) => entry.id === input.data.before)
    )
      throw new AuthError("Invalid key audit response", 503);
    return page.data;
  };
}
