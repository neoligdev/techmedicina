import { useMemo } from "react";
import { JourneySelfReportCard } from "./self-report-card";
import { createJourneySelfReportClient } from "./self-report-client";
import type { ComponentProps } from "react";
/** Mount only with a server-authorized goal and stable report ID/time. */
export function JourneySelfReportConnectedCard({
  getAccessToken,
  fetcher,
  ...props
}: Omit<ComponentProps<typeof JourneySelfReportCard>, "send"> & {
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}) {
  const send = useMemo(
    () =>
      createJourneySelfReportClient(
        {
          clinicId: props.clinicId,
          patientId: props.patientId,
          getAccessToken,
        },
        fetcher,
      ),
    [props.clinicId, props.patientId, getAccessToken, fetcher],
  );
  return <JourneySelfReportCard {...props} send={send} />;
}
