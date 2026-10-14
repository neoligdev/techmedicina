import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { createHostAuthContext } from "../white-label/host-auth-context.server";
import {
  extractTrustedHost,
  HostResolver,
  isLocalOrPreviewHost,
  normalizeHost,
  RESERVED_HOST_NAMES,
  type ExtractHostOptions,
} from "../white-label/host-resolver";

const domainSchema = z
  .object({
    hostname: z.string(),
    clinicId: z.string().uuid(),
    environment: z.enum(["clinic_portal", "patient_pwa"]),
    status: z.enum(["active", "pending_verification", "suspended", "retired"]),
  })
  .strict();

/** Local composition only. Registry lookup must be server-owned, not browser input.
 * Proxy trust must come from a reviewed deployment/peer policy, never a request parameter.
 * Session resolver validates Auth on this exact request; no session/token or mapping is cached here.
 */
export function createJourneyHostSessionResolver<S extends { identity: AuthenticatedIdentity }>(
  environment: "clinic_portal" | "patient_pwa",
  lookup: (hostname: string) => Promise<unknown>,
  resolveSession: (request: Request) => Promise<S | null>,
  proxyOptions: ExtractHostOptions = {},
) {
  return async (request: Request) => {
    const extracted = extractTrustedHost(request.headers, proxyOptions);
    const authority = normalizeHost(new URL(request.url).host);
    if (
      !extracted.host ||
      (!proxyOptions.trustedProxy && authority.host !== extracted.host) ||
      isLocalOrPreviewHost(extracted.host) ||
      RESERVED_HOST_NAMES.has(extracted.host.split(".")[0]!)
    )
      throw new AuthError("Clinical host denied", 403);
    const entry = domainSchema.safeParse(await lookup(extracted.host));
    if (
      !entry.success ||
      entry.data.hostname !== extracted.host ||
      entry.data.environment !== environment ||
      entry.data.status !== "active"
    )
      throw new AuthError("Clinical host denied", 403);
    const host = new HostResolver([entry.data]).resolveHost(extracted.host);
    const session = await resolveSession(request);
    if (!session) return null;
    const context = createHostAuthContext(host, session.identity);
    const link = context.identity.links[0];
    if (
      environment === "clinic_portal" &&
      (link?.role !== "medico" || !link.medicalIdentityVerified)
    )
      throw new AuthError("Clinical role denied", 403);
    return { context, session };
  };
}
