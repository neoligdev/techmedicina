import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { reservedDomainSchema } from "@/features/auth/domain-reservations";
import { routingChallengeSchema } from "./domain-routing-proof.server";
import { routingReceiptSchema } from "./domain-routing-persistence.server";

const stateSchema = z
  .object({ domain: reservedDomainSchema, challenge: routingChallengeSchema })
  .strict();
const receiptStateSchema = z
  .object({
    receipt: routingReceiptSchema,
    recordedAt: z.string().datetime({ offset: true }),
    recordedBy: z.string().uuid(),
    isCurrent: z.boolean(),
    isValid: z.boolean(),
  })
  .strict()
  .refine((s) => !s.isValid || s.isCurrent)
  .refine((s) => Date.parse(s.recordedAt) >= Date.parse(s.receipt.routingVerifiedAt));
function authorize(identity: AuthenticatedIdentity, ...ids: string[]) {
  if (identity.globalRole !== "super_admin")
    throw new AuthError("Administrative access denied", 403);
  if (ids.some((id) => !z.string().uuid().safeParse(id).success))
    throw new AuthError("Invalid routing request", 400);
}
/** Private worker transport must enforce persisted authorization; no default client or endpoint. */
export function createRoutingChallengeReader(
  read: (identity: AuthenticatedIdentity, domainId: string) => Promise<unknown>,
  now = () => new Date(),
) {
  return async (identity: AuthenticatedIdentity, domainId: string) => {
    authorize(identity, domainId);
    let raw: unknown;
    try {
      raw = await read(identity, domainId);
    } catch {
      throw new AuthError("Routing challenge unavailable", 503);
    }
    if (raw === null) return null;
    const state = stateSchema.safeParse(raw);
    if (!state.success || state.data.domain.id !== domainId)
      throw new AuthError("Invalid stored routing challenge", 503);
    const { domain, challenge } = state.data;
    if (
      challenge.domainId !== domain.id ||
      challenge.clinicId !== domain.clinic_id ||
      challenge.hostname !== domain.hostname ||
      challenge.environment !== domain.environment ||
      challenge.revision !== domain.revision
    )
      throw new AuthError("Invalid stored routing challenge", 503);
    const instant = now().getTime();
    if (
      !Number.isFinite(instant) ||
      instant < Date.parse(challenge.createdAt) ||
      instant >= Date.parse(challenge.expiresAt)
    )
      return null;
    return state.data;
  };
}
/** Returns historical evidence with explicit validity; never replays network or proof consumption. */
export function createRoutingReceiptReader(
  read: (
    identity: AuthenticatedIdentity,
    domainId: string,
    challengeId: string,
  ) => Promise<unknown>,
  now = () => new Date(),
) {
  return async (identity: AuthenticatedIdentity, domainId: string, challengeId: string) => {
    authorize(identity, domainId, challengeId);
    let raw: unknown;
    try {
      raw = await read(identity, domainId, challengeId);
    } catch {
      throw new AuthError("Routing receipt unavailable", 503);
    }
    if (raw === null) return null;
    const parsed = receiptStateSchema.safeParse(raw);
    if (
      !parsed.success ||
      parsed.data.receipt.domainId !== domainId ||
      parsed.data.receipt.challengeId !== challengeId
    )
      throw new AuthError("Invalid stored routing receipt", 503);
    const state = parsed.data,
      instant = now().getTime();
    return {
      ...state,
      isValid:
        state.isValid &&
        Number.isFinite(instant) &&
        instant >= Date.parse(state.receipt.routingVerifiedAt) &&
        instant < Date.parse(state.receipt.expiresAt),
    };
  };
}
