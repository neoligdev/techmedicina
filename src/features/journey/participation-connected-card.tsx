import { useMemo } from "react";
import { JourneyParticipationCard } from "./participation-card";
import { createJourneyParticipationClient } from "./participation-client";

/** Ready for an authenticated patient host; not mounted in the demo shell. */
export function JourneyParticipationConnectedCard(props: {
  onMutationState?: (state: "pending" | "settled") => void;
  clinicId: string;
  patientId: string;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}) {
  const { clinicId, patientId, getAccessToken, fetcher, onMutationState } = props;
  const client = useMemo(
    () => createJourneyParticipationClient({ clinicId, patientId, getAccessToken }, fetcher),
    [clinicId, patientId, getAccessToken, fetcher],
  );
  return (
    <JourneyParticipationCard
      clinicId={clinicId}
      patientId={patientId}
      read={client.read}
      save={client.save}
      {...(onMutationState ? { onMutationState } : {})}
    />
  );
}
