import { hydrationWindowSchema, type HydrationRecord } from "./contracts";
import { projectHydration } from "./history";
import { createOwnHydrationContextClient } from "./own-context-client";
import { createHydrationListClient } from "./list-client";
export async function loadOwnHydrationHistory(
  windowValue: unknown,
  options: {
    getAccessToken: () => Promise<string | null>;
    fetcher?: typeof fetch;
    signal?: AbortSignal;
  },
) {
  const window = hydrationWindowSchema.parse(windowValue);
  const check = () => {
    if (options.signal?.aborted) throw new Error("Hydration read cancelled");
  };
  check();
  const scope = await createOwnHydrationContextClient(options.getAccessToken, options.fetcher)();
  check();
  const empty = projectHydration(scope, [], window),
    first = empty.buckets[0]!.key,
    date = first.length === 7 ? first + "-01" : first;
  // Conservative query margin for supported operational zones; projection applies exact local dates.
  const from = new Date(Date.parse(date + "T00:00:00Z") - 48 * 60 * 60 * 1000).toISOString(),
    until = new Date(Date.parse(window.asOf) + 1).toISOString();
  const read = createHydrationListClient(options.getAccessToken, options.fetcher),
    records: HydrationRecord[] = [],
    seen = new Set<string>();
  let after: string | undefined;
  for (let page = 0; page < 1000; page++) {
    check();
    const result = await read({ from, until, limit: 100, ...(after ? { after } : {}) }, scope);
    check();
    for (const r of result.records) {
      if (seen.has(r.id.toLowerCase())) throw new Error("Duplicate hydration record");
      seen.add(r.id.toLowerCase());
      records.push(r);
    }
    if (records.length > 100000) throw new Error("Hydration interval too large");
    if (result.nextCursor === null) return { scope, window, records };
    after = result.nextCursor;
  }
  throw new Error("Hydration interval incomplete");
}
