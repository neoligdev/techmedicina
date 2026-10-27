import { z } from "zod";
import { journeyParticipationSchema } from "./participation";
import { withJourneyDeadline } from "./request-deadline";
export const selfReportAccessSchema = z
  .object({ preference: journeyParticipationSchema, canSubmit: z.boolean() })
  .strict()
  .refine((v) => !v.canSubmit || v.preference.isEnabled);
/** A capability snapshot only: every write rechecks the database. */
export function createSelfReportAccessClient(
  scope: { clinicId: string; patientId: string; getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  return () =>
    withJourneyDeadline(async (signal) => {
      const token = await scope.getAccessToken();
      if (!token || signal.aborted) throw new Error("Session required");
      const response = await fetcher("/api/journey/self-report-access", {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!response.ok) throw new Error("Report access unavailable");
      const value = selfReportAccessSchema.parse(await response.json());
      if (
        value.preference.clinicId !== scope.clinicId ||
        value.preference.patientId !== scope.patientId
      )
        throw new Error("Unexpected scope");
      return value;
    });
}
