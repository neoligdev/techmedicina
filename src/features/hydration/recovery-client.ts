import { z } from "zod";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import { hydrationScopeSchema } from "./contracts";
import { hydrationCommandSchema } from "./mutation-contract";
import { hydrationRecoverySchema, validateHydrationRecovery } from "./recovery-contract";
/** Read only, no retries or browser storage. The caller retains the original command in memory. */
export function createHydrationRecoveryClient(
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  return (commandValue: unknown, scopeValue: unknown) =>
    withRequestDeadline(async (signal) => {
      const command = hydrationCommandSchema.parse(commandValue),
        scope = hydrationScopeSchema.parse(scopeValue),
        token = await getAccessToken();
      if (!token || signal.aborted) throw new Error("Session required");
      const query = new URLSearchParams({
        recordId: command.recordId,
        sourceRequestId: command.sourceRequestId,
      });
      const response = await fetcher("/api/hydration/receipt?" + query, {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!response.ok) throw new Error("Hydration confirmation unavailable");
      const { result } = z
        .object({ result: hydrationRecoverySchema })
        .strict()
        .parse(await response.json());
      return validateHydrationRecovery(result, scope, command);
    });
}
