import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { ownAvailabilityScope } from "./availability.server";
import { availabilityProposalSchema } from "@/features/agenda/availability";
const stored = z
  .object({
    id: z.string().uuid(),
    clinic_id: z.string().uuid(),
    doctor_user_id: z.string().uuid(),
    source_request_id: z.string().uuid(),
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
    created_at: z.string().datetime({ offset: true }),
  })
  .strict();
export type AvailabilityRpc = (args: {
  p_clinic_id: string;
  p_source_request_id: string;
  p_starts_at: string;
  p_ends_at: string;
}) => Promise<{ data: unknown; error: { code?: string } | null }>;
/** Same-bearer SQL RPC must perform overlap checking and authorization atomically. */
export async function createOwnAvailability(
  context: AuthContext,
  value: unknown,
  rpc: AvailabilityRpc,
) {
  const scope = ownAvailabilityScope(context);
  const input = availabilityProposalSchema.safeParse(value);
  if (!input.success) throw new AuthError("Invalid availability", 400);
  const { data, error } = await rpc({
    p_clinic_id: scope.clinicId,
    p_source_request_id: input.data.sourceRequestId,
    p_starts_at: input.data.interval.startsAt,
    p_ends_at: input.data.interval.endsAt,
  });
  if (error) {
    if (error.code === "23505") throw new AuthError("Availability conflict", 409);
    if (error.code === "42501") throw new AuthError("Availability denied", 403);
    if (error.code === "22023") throw new AuthError("Invalid availability", 400);
    throw new Error("Availability unavailable");
  }
  const saved = stored.parse(data);
  if (
    saved.clinic_id !== scope.clinicId ||
    saved.doctor_user_id !== scope.doctorUserId ||
    saved.source_request_id !== input.data.sourceRequestId ||
    Date.parse(saved.starts_at) !== Date.parse(input.data.interval.startsAt) ||
    Date.parse(saved.ends_at) !== Date.parse(input.data.interval.endsAt)
  )
    throw new Error("Unexpected availability receipt");
  return {
    id: saved.id,
    ...scope,
    sourceRequestId: saved.source_request_id,
    interval: {
      startsAt: new Date(saved.starts_at).toISOString(),
      endsAt: new Date(saved.ends_at).toISOString(),
    },
    createdAt: new Date(saved.created_at).toISOString(),
  };
}
