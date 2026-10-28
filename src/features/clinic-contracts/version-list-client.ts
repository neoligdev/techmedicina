import { z } from "zod";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import { contractVersionListQuerySchema, validateContractVersionPage } from "./history-contract";
export function createContractVersionListClient(
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  return (value: unknown) =>
    withRequestDeadline(async (signal) => {
      const input = contractVersionListQuerySchema.parse(value),
        token = await getAccessToken();
      if (!token || signal.aborted) throw new Error("Session required");
      const params = new URLSearchParams({
        id: input.id,
        clinicId: input.clinicId,
        limit: String(input.limit),
      });
      if (input.before !== undefined) params.set("before", String(input.before));
      const r = await fetcher("/api/platform/clinic-contract-versions?" + params, {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!r.ok) throw new Error("History unavailable");
      const { page } = z
        .object({ page: z.unknown() })
        .strict()
        .parse(await r.json());
      return validateContractVersionPage(page, input);
    });
}
