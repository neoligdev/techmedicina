import { useMemo } from "react";
import { createJourneyGoalDraftClient } from "./goal-draft-client";
import { JourneyGoalDraftForm } from "./goal-draft-form";

export function JourneyGoalDraftConnectedForm(props: {
  clinicId: string;
  patientId: string;
  canCreate?: boolean;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}) {
  const { clinicId, patientId, getAccessToken, fetcher } = props;
  const send = useMemo(
    () => createJourneyGoalDraftClient({ clinicId, patientId, getAccessToken }, fetcher),
    [clinicId, patientId, getAccessToken, fetcher],
  );
  return (
    <JourneyGoalDraftForm
      clinicId={clinicId}
      patientId={patientId}
      canCreate={props.canCreate ?? false}
      send={send}
    />
  );
}
