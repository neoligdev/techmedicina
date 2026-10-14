import { z } from "zod";
import { journeyGoalViewSchema } from "./goal-pause";
import { withJourneyDeadline } from "./request-deadline";
const responseSchema = z.object({ goal: journeyGoalViewSchema }).strict();
export function createJourneyGoalReadClient(
  scope: { clinicId: string; patientId: string; getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  return async (goalId: string) => {
    const id = z.string().uuid().parse(goalId);
    return withJourneyDeadline(async (signal) => {
      const token = await scope.getAccessToken();
      if (signal.aborted) throw new Error("Journey request expired");
      if (!token) throw new Error("Session required");
      const response = await fetcher(`/api/journey/goals?${new URLSearchParams({ goalId: id })}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!response.ok) throw new Error("Goal unavailable");
      const { goal } = responseSchema.parse(await response.json());
      if (
        goal.goalId !== id ||
        goal.clinicId !== scope.clinicId ||
        goal.patientId !== scope.patientId
      )
        throw new Error("Unexpected goal response");
      return goal;
    });
  };
}
