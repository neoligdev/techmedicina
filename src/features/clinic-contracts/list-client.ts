import { z } from "zod";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import { clinicContractListQuerySchema, clinicContractListPageSchema } from "./list-contract";
export function createClinicContractListClient(
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  return (value: unknown) =>
    withRequestDeadline(async (signal) => {
      const input = clinicContractListQuerySchema.parse(value),
        token = await getAccessToken();
      if (!token || signal.aborted) throw new Error("Session required");
      const params = new URLSearchParams({
        clinicId: input.clinicId,
        q: input.q,
        limit: String(input.limit),
      });
      if (input.after) params.set("after", input.after);
      const response = await fetcher("/api/platform/clinic-contract-drafts?" + params, {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!response.ok) throw new Error("Library unavailable");
      const { page } = z
        .object({ page: clinicContractListPageSchema })
        .strict()
        .parse(await response.json());
      if (
        page.clinicId !== input.clinicId ||
        page.query !== input.q ||
        page.items.length > input.limit ||
        (page.nextCursor !== null && page.items.length !== input.limit) ||
        page.items.some((i) => input.after && i.id.toLowerCase() <= input.after.toLowerCase())
      )
        throw new Error("Unexpected page");
      return page;
    });
}
