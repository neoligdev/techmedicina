import { z } from "zod";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import { hydrationScopeSchema } from "./contracts";
import {
  hydrationSettingsCommandSchema,
  hydrationSettingsResultSchema,
  validateHydrationSettings,
} from "./settings-contract";
import { HydrationWriteError } from "./mutation-client";
export function createHydrationSettingsClient(
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  async function execute(scopeValue: unknown, commandValue?: unknown, requestId?: string) {
    const scope = hydrationScopeSchema.parse(scopeValue),
      command =
        commandValue === undefined ? undefined : hydrationSettingsCommandSchema.parse(commandValue);
    if (requestId !== undefined) z.string().uuid().parse(requestId);
    let dispatched = false;
    try {
      return await withRequestDeadline(async (signal) => {
        const token = await getToken();
        if (!token || signal.aborted) throw new HydrationWriteError("rejected", 401);
        const path =
          "/api/hydration/preferences" +
          (requestId ? "?" + new URLSearchParams({ sourceRequestId: requestId }) : "");
        dispatched = true;
        const response = await fetcher(path, {
          method: command ? "POST" : "GET",
          headers: {
            Authorization: "Bearer " + token,
            ...(command ? { "Content-Type": "application/json" } : {}),
          },
          ...(command ? { body: JSON.stringify(command) } : {}),
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal,
        });
        if (!response.ok)
          throw new HydrationWriteError(
            response.status === 409
              ? "conflict"
              : [400, 401, 403, 405, 413, 415].includes(response.status)
                ? "rejected"
                : "uncertain",
            response.status,
          );
        const { result } = z
          .object({ result: hydrationSettingsResultSchema })
          .strict()
          .parse(await response.json());
        const valid = validateHydrationSettings(result, scope, command);
        if (command && !valid.receipt) throw new Error("Missing receipt");
        if (
          requestId &&
          valid.receipt &&
          valid.receipt.command.sourceRequestId.toLowerCase() !== requestId.toLowerCase()
        )
          throw new Error("Unexpected receipt");
        return valid;
      });
    } catch (error) {
      if (error instanceof HydrationWriteError) throw error;
      throw new HydrationWriteError(dispatched ? "uncertain" : "rejected");
    }
  }
  return {
    read: (scope: unknown, requestId?: string) => execute(scope, undefined, requestId),
    save: (scope: unknown, command: unknown) => execute(scope, command),
  };
}
