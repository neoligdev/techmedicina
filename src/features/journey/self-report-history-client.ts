import { z } from "zod";
import { selfReportHistoryQuerySchema, selfReportHistoryPageSchema } from "./self-report-history";
import { withJourneyDeadline } from "./request-deadline";
/** Scope checks response only; host/Auth/RPC authorize every page. No health cache. */
export function createOwnSelfReportHistoryClient(
  scope: { clinicId: string; patientId: string; getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  return (value: unknown = {}) =>
    withJourneyDeadline(async (signal) => {
      const query = selfReportHistoryQuerySchema.parse(value);
      const token = await scope.getAccessToken();
      if (signal.aborted || !token) throw new Error("Session required");
      const params = new URLSearchParams({ limit: String(query.limit) });
      if (query.before) params.set("before", query.before);
      const response = await fetcher(`/api/journey/self-reports?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!response.ok) throw new Error("Self-report history unavailable");
      const { page } = z
        .object({ page: selfReportHistoryPageSchema })
        .strict()
        .parse(await response.json());
      if (
        page.clinicId !== scope.clinicId ||
        page.patientId !== scope.patientId ||
        page.events.length > query.limit ||
        page.events.some((e) => e.id === query.before) ||
        (page.nextCursor !== null && page.events.length !== query.limit)
      )
        throw new Error("Unexpected history page");
      return page;
    });
}
