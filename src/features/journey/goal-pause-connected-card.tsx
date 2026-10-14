import { useCallback, useMemo } from "react";
import { createJourneyGoalReadClient } from "./goal-read-client";
import { JourneyGoalPauseCard } from "./goal-pause-card";
import { createJourneyGoalPauseClient } from "./goal-pause-client";
import type { JourneyGoalView } from "./goal-pause";

/** Ready for a server-authorized medical view; not mounted in the demo shell. */
export function JourneyGoalPauseConnectedCard({
  goal,
  canPause = false,
  refresh,
  getAccessToken,
  fetcher,
}: {
  goal: JourneyGoalView;
  canPause?: boolean;
  refresh?: () => Promise<unknown>;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}) {
  const pause = useMemo(
    () =>
      createJourneyGoalPauseClient(
        { clinicId: goal.clinicId, patientId: goal.patientId, getAccessToken },
        fetcher,
      ),
    [goal.clinicId, goal.patientId, getAccessToken, fetcher],
  );
  const read = useMemo(
    () =>
      createJourneyGoalReadClient(
        { clinicId: goal.clinicId, patientId: goal.patientId, getAccessToken },
        fetcher,
      ),
    [goal.clinicId, goal.patientId, getAccessToken, fetcher],
  );
  const reload = useCallback(() => read(goal.goalId), [read, goal.goalId]);
  return (
    <JourneyGoalPauseCard
      goal={goal}
      canPause={canPause}
      pause={pause}
      refresh={refresh ?? reload}
    />
  );
}
