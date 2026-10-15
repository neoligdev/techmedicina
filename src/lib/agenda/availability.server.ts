import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import {
  availabilityProposalSchema,
  availabilityIntervalSchema,
  availabilityOverlaps,
} from "@/features/agenda/availability";

/** Local preflight only. It does not reserve or publish a slot. An eventual write
 * must repeat overlap checks atomically under the request bearer in PostgreSQL.
 */
export async function prepareOwnAvailability(
  context: AuthContext,
  value: unknown,
  listOccupied: (scope: { clinicId: string; doctorUserId: string }) => Promise<unknown>,
) {
  const links = context.identity.links.filter(
    (link) => link.clinicId === context.currentClinicId && link.isActive,
  );
  const link = links[0];
  if (
    !context.currentClinicId ||
    links.length !== 1 ||
    link?.role !== "medico" ||
    !link.medicalIdentityVerified ||
    !link.grants.some((grant) => grant.resource === "agenda" && grant.action === "write")
  )
    throw new AuthError("Availability denied", 403);
  const input = availabilityProposalSchema.safeParse(value);
  if (!input.success) throw new AuthError("Invalid availability", 400);
  const scope = { clinicId: context.currentClinicId, doctorUserId: context.identity.userId };
  const intervals = z
    .array(
      z
        .object({
          clinicId: z.string().uuid(),
          doctorUserId: z.string().uuid(),
          interval: availabilityIntervalSchema,
        })
        .strict(),
    )
    .parse(await listOccupied(scope));
  if (
    intervals.some(
      (item) => item.clinicId !== scope.clinicId || item.doctorUserId !== scope.doctorUserId,
    )
  )
    throw new Error("Unexpected availability scope");
  if (intervals.some((item) => availabilityOverlaps(input.data.interval, item.interval)))
    throw new AuthError("Availability overlap", 409);
  return {
    ...scope,
    sourceRequestId: input.data.sourceRequestId,
    interval: {
      startsAt: new Date(input.data.interval.startsAt).toISOString(),
      endsAt: new Date(input.data.interval.endsAt).toISOString(),
    },
  };
}
