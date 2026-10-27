import { z } from "zod";
import { selfReportStatusQuerySchema, selfReportStatusSchema } from "./self-report-status";
import { withJourneyDeadline } from "./request-deadline";
export function createOwnSelfReportStatusClient(
  scope: { clinicId: string; patientId: string; getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  return (sourceEventId: string) =>
    withJourneyDeadline(async (signal) => {
      const query = selfReportStatusQuerySchema.parse({ sourceEventId });
      const token = await scope.getAccessToken();
      if (!token || signal.aborted) throw new Error("Session required");
      const response = await fetcher(
        "/api/journey/self-report-status?" + new URLSearchParams(query),
        {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal,
        },
      );
      if (!response.ok) throw new Error("Report status unavailable");
      const { report } = z
        .object({ report: selfReportStatusSchema })
        .strict()
        .parse(await response.json());
      if (
        report.clinicId !== scope.clinicId ||
        report.patientId !== scope.patientId ||
        (report.event && report.event.sourceEventId !== sourceEventId)
      )
        throw new Error("Unexpected report scope");
      return report.event;
    });
}
