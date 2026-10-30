import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { isAuthorized } from "@/lib/auth/core";
import { AuthError } from "@/lib/auth/guards.server";
import { createJourneyHostSessionResolver as createVerifiedPatientHostResolver } from "@/lib/journey/host-session.server";
import { hydrationScopeSchema } from "@/features/hydration/contracts";
/** Reuses only host validation; lookup must be hydration-specific, never Journey permissions. */
export function createOwnHydrationContextResolver<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  lookup: (hostname: string) => Promise<unknown>;
  resolveSession: (request: Request) => Promise<S | null>;
}) {
  const resolve = createVerifiedPatientHostResolver(
    "patient_pwa",
    providers.lookup,
    providers.resolveSession,
  );
  return async (request: Request) => {
    const bound = await resolve(request);
    if (!bound) return null;
    const link = bound.context.identity.links[0];
    const scope = hydrationScopeSchema.parse({
      clinicId: bound.context.currentClinicId,
      patientId: link?.patientId,
    });
    const patientLink = { ...scope, isActive: true };
    if (
      !isAuthorized(bound.context, "hydration_records", "read", {
        ownerClinicId: scope.clinicId,
        ownerPatientId: scope.patientId,
        patientLink,
      })
    )
      throw new AuthError("Access denied", 403);
    return {
      session: bound.session,
      authContext: bound.context,
      patientId: scope.patientId,
      patientLink,
    };
  };
}
