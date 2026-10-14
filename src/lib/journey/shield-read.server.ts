import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { patientShieldOverviewSchema } from "@/features/journey/contracts";

/** Verified host/session only. Repository must retain request bearer and RLS.
 * Scope is derived exclusively from the patient's active link, never a query/body.
 */
export async function readOwnShields(
  context: AuthContext,
  read: (clinicId: string, patientId: string) => Promise<unknown>,
) {
  const links = context.identity.links.filter(
    (link) => link.isActive && link.clinicId === context.currentClinicId,
  );
  const link = links[0];
  if (
    !context.currentClinicId ||
    links.length !== 1 ||
    link?.role !== "paciente" ||
    !z.string().uuid().safeParse(link.patientId).success ||
    !link.grants.some((grant) => grant.resource === "journey_shields" && grant.action === "read")
  )
    throw new AuthError("Shield read denied", 403);
  const patientId = link.patientId!;
  const overview = patientShieldOverviewSchema.parse(
    await read(context.currentClinicId, patientId),
  );
  if (
    overview.clinicId !== context.currentClinicId ||
    overview.patientId !== patientId ||
    overview.state.clinicId !== context.currentClinicId ||
    overview.state.patientId !== patientId ||
    overview.history.some(
      (event) => event.clinicId !== context.currentClinicId || event.patientId !== patientId,
    )
  )
    throw new Error("Unexpected shield scope");
  return overview;
}
