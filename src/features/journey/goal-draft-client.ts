import { z } from "zod";
import { journeyGoalDraftInputSchema } from "./goal-draft";
import { withJourneyDeadline } from "./request-deadline";

export const journeyGoalDraftReceiptSchema = z
  .object({
    id: z.string().uuid(),
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    sourceRequestId: z.string().uuid(),
    kind: journeyGoalDraftInputSchema.shape.kind,
    cadence: journeyGoalDraftInputSchema.shape.cadence,
    state: z.literal("draft"),
    createdAt: z.string().datetime(),
  })
  .strict();

export class JourneyGoalDraftConflict extends Error {}

/** Reuse the exact input after uncertainty. Browser checks do not grant access;
 * the medical host, verified session and SQL enforce authorization.
 */
export function createJourneyGoalDraftClient(
  scope: { clinicId: string; patientId: string; getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  return async (value: unknown) => {
    const input = journeyGoalDraftInputSchema.parse(value);
    if (input.patientId !== scope.patientId) throw new Error("Unexpected draft patient");
    return withJourneyDeadline(async (signal) => {
      const token = await scope.getAccessToken();
      if (signal.aborted) throw new Error("Journey request expired");
      if (!token) throw new Error("Session required");
      const response = await fetcher("/api/journey/goal-drafts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (response.status === 409) throw new JourneyGoalDraftConflict("Draft conflict");
      if (!response.ok) throw new Error("Draft unavailable");
      const { draft } = z
        .object({ draft: journeyGoalDraftReceiptSchema })
        .strict()
        .parse(await response.json());
      if (
        draft.clinicId !== scope.clinicId ||
        draft.patientId !== scope.patientId ||
        draft.sourceRequestId !== input.sourceRequestId ||
        draft.kind !== input.kind ||
        draft.cadence !== input.cadence
      )
        throw new Error("Unexpected draft receipt");
      return draft;
    });
  };
}
