import { z } from "zod";
import { ownJourneyContextSchema } from "./own-context";
import { withJourneyDeadline } from "./request-deadline";
/** No caller-selected tenant/patient. Server derives them from verified host and membership. */
export function createOwnJourneyContextClient(
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  return () =>
    withJourneyDeadline(async (signal) => {
      const token = await getAccessToken();
      if (signal.aborted || !token) throw new Error("Session required");
      const response = await fetcher("/api/journey/context", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!response.ok) throw new Error("Journey context unavailable");
      return z
        .object({ scope: ownJourneyContextSchema })
        .strict()
        .parse(await response.json()).scope;
    });
}
