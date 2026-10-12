import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthContext, AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import type { HostResolutionResult } from "./host-resolver";

/** Inputs must come from the trusted server registry and verified Auth identity.
 * This contract does not resolve request headers or accept browser tenant selection.
 */
export function createHostAuthContext(
  host: HostResolutionResult,
  identity: AuthenticatedIdentity | null,
): AuthContext {
  if (!identity) throw new AuthError("Session required", 401);
  if (!host.ok || host.domainStatus !== "active" || host.environment === "demo")
    throw new AuthError("Host access denied", 403);
  if (host.environment === "central") {
    if (host.clinicId || identity.globalRole !== "super_admin")
      throw new AuthError("Central access denied", 403);
    // Central administrative access never imports clinical memberships.
    return { identity: { userId: identity.userId, globalRole: "super_admin", links: [] } };
  }
  const clinic = z.string().uuid().safeParse(host.clinicId);
  if (!clinic.success) throw new AuthError("Clinic context required", 403);
  const links = identity.links.filter((link) => link.clinicId === clinic.data && link.isActive);
  if (links.length !== 1) throw new AuthError("Clinic access denied", 403);
  const link = links[0]!;
  const permitted =
    host.environment === "patient_pwa"
      ? link.role === "paciente" && z.string().uuid().safeParse(link.patientId).success
      : host.environment === "clinic_portal" &&
        (link.role === "admin" ||
          (link.role === "medico" && link.medicalIdentityVerified === true));
  if (!permitted) throw new AuthError("Environment access denied", 403);
  // No global-role shortcut and no memberships from other clinics on tenant origins.
  return {
    currentClinicId: clinic.data,
    identity: {
      userId: identity.userId,
      links: [{ ...link, grants: link.grants.map((grant) => ({ ...grant })) }],
    },
  };
}
