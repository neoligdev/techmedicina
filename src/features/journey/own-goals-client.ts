import { z } from "zod";
import { ownGoalsQuerySchema, ownGoalsPageSchema } from "./own-goals";
import { withJourneyDeadline } from "./request-deadline";
/** Scope checks response only; host/Auth/RPC authorize every page. No health cache. */
export function createOwnGoalsClient(
  scope: { clinicId: string; patientId: string; getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  return (value: unknown = {}) =>
    withJourneyDeadline(async (signal) => {
      const query = ownGoalsQuerySchema.parse(value);
      const token = await scope.getAccessToken();
      if (signal.aborted || !token) throw new Error("Session required");
      const params = new URLSearchParams({ limit: String(query.limit) });
      if (query.after) params.set("after", query.after);
      const response = await fetcher(`/api/journey/own-goals?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!response.ok) throw new Error("Own goals unavailable");
      const { page } = z
        .object({ page: ownGoalsPageSchema })
        .strict()
        .parse(await response.json());
      if (
        page.clinicId !== scope.clinicId ||
        page.patientId !== scope.patientId ||
        page.goals.length > query.limit ||
        page.goals.some((e) => query.after && e.id.toLowerCase() <= query.after.toLowerCase()) ||
        (page.nextCursor !== null && page.goals.length !== query.limit)
      )
        throw new Error("Unexpected goals page");
      return page;
    });
}
