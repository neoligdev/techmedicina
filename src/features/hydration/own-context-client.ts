import { z } from "zod";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import { hydrationScopeSchema } from "./contracts";
/** No caller-selected clinic/patient: these values must come from the verified host endpoint. */
export function createOwnHydrationContextClient(
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  return () =>
    withRequestDeadline(async (signal) => {
      const token = await getAccessToken();
      if (!token || signal.aborted) throw new Error("Session required");
      const r = await fetcher("/api/hydration/context", {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!r.ok) throw new Error("Hydration context unavailable");
      return z
        .object({ scope: hydrationScopeSchema })
        .strict()
        .parse(await r.json()).scope;
    });
}
