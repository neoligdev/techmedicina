import { z } from "zod";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import { hydrationScopeSchema, hydrationRecordSchema } from "./contracts";
import { hydrationCommandSchema, hydrationReceiptSchema } from "./mutation-contract";
import { validateHydrationRecovery } from "./recovery-contract";
export class HydrationWriteError extends Error {
  constructor(
    public readonly outcome: "rejected" | "conflict" | "uncertain",
    public readonly status?: number,
  ) {
    super(
      outcome === "uncertain"
        ? "Resultado não confirmado; consulte o recibo original"
        : outcome === "conflict"
          ? "Conflito; consulte o recibo e a revisão atual"
          : "Registro não autorizado ou inválido",
    );
  }
}
/** One request only. An uncertain command must be retained unchanged by the caller. */
export function createHydrationMutationClient(
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  return async (commandValue: unknown, scopeValue: unknown) => {
    const command = hydrationCommandSchema.parse(commandValue),
      scope = hydrationScopeSchema.parse(scopeValue);
    let dispatched = false;
    try {
      return await withRequestDeadline(async (signal) => {
        const token = await getAccessToken();
        if (!token || signal.aborted) throw new HydrationWriteError("rejected", 401);
        dispatched = true;
        const response = await fetcher("/api/hydration/mutate", {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify(command),
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
          .object({
            result: z
              .object({
                receipt: hydrationReceiptSchema,
                record: hydrationRecordSchema,
                replayed: z.boolean(),
              })
              .strict(),
          })
          .strict()
          .parse(await response.json());
        validateHydrationRecovery(
          { ...scope, receipt: result.receipt, record: result.record },
          scope,
          command,
        );
        return result;
      });
    } catch (error) {
      if (error instanceof HydrationWriteError) throw error;
      throw new HydrationWriteError(dispatched ? "uncertain" : "rejected");
    }
  };
}
