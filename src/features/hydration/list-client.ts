import { z } from "zod";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import { hydrationScopeSchema } from "./contracts";
import {
  hydrationListQuerySchema,
  hydrationListPageSchema,
  validateHydrationPage,
} from "./list-contract";
/** Expected scope checks a response; authorization belongs to the server, never these IDs. */
export function createHydrationListClient(
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  return (queryValue: unknown, scopeValue: unknown) =>
    withRequestDeadline(async (signal) => {
      const query = hydrationListQuerySchema.parse(queryValue),
        scope = hydrationScopeSchema.parse(scopeValue),
        token = await getAccessToken();
      if (!token || signal.aborted) throw new Error("Session required");
      const params = new URLSearchParams({
        from: query.from,
        until: query.until,
        limit: String(query.limit),
        ...(query.after ? { after: query.after } : {}),
      });
      const r = await fetcher("/api/hydration/records?" + params, {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!r.ok) throw new Error("Hydration history unavailable");
      const { page } = z
        .object({ page: hydrationListPageSchema })
        .strict()
        .parse(await r.json());
      return validateHydrationPage(page, scope, query);
    });
}
