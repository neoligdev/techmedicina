import { z } from "zod";
import {
  goalPauseInputSchema,
  goalPauseReceiptSchema,
  JourneyGoalPauseConflict,
} from "./goal-pause";
import { withJourneyDeadline } from "./request-deadline";
const responseSchema = z.object({ goal: goalPauseReceiptSchema }).strict();
/** The browser scope validates responses; server Auth/host/RLS remain authoritative. */
export function createJourneyGoalPauseClient(
  scope: { clinicId: string; patientId: string; getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  return async (value: unknown) => {
    const input = goalPauseInputSchema.parse(value);
    return withJourneyDeadline(async (signal) => {
      const token = await scope.getAccessToken();
      if (signal.aborted) throw new Error("Journey request expired");
      if (!token) throw new Error("Session required");
      const response = await fetcher("/api/journey/goals/pause", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (response.status === 409) throw new JourneyGoalPauseConflict();
      if (!response.ok) throw new Error("Goal pause unavailable");
      const { goal } = responseSchema.parse(await response.json());
      if (
        goal.goalId !== input.goalId ||
        goal.clinicId !== scope.clinicId ||
        goal.patientId !== scope.patientId ||
        ![input.expectedVersion, input.expectedVersion + 1].includes(goal.version)
      )
        throw new Error("Unexpected goal response");
      return goal;
    });
  };
}
