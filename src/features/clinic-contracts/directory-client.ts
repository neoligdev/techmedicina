import { clinicCursorSchema, clinicDirectorySchema } from "@/features/auth/clinic-directory";
import type { ClinicCursor } from "@/features/auth/clinic-directory";
import { withRequestDeadline } from "@/lib/http/request-deadline";
export function createContractClinicDirectoryClient(
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  return (cursor?: ClinicCursor) =>
    withRequestDeadline(async (signal) => {
      const checked = cursor === undefined ? undefined : clinicCursorSchema.parse(cursor);
      const token = await getAccessToken();
      if (!token || signal.aborted) throw new Error("Session required");
      const params = checked ? "?" + new URLSearchParams(checked) : "";
      const r = await fetcher("/api/platform/clinics" + params, {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!r.ok) throw new Error("Directory unavailable");
      const page = clinicDirectorySchema.parse(await r.json()),
        last = page.clinics.at(-1);
      if (
        new Set(page.clinics.map((c) => c.id)).size !== page.clinics.length ||
        (page.hasMore
          ? page.clinics.length !== 100 ||
            !page.nextCursor ||
            page.nextCursor.beforeId !== last?.id ||
            page.nextCursor.before !== last?.created_at
          : page.nextCursor != null) ||
        (checked && page.clinics.some((c) => c.id === checked.beforeId))
      )
        throw new Error("Unexpected directory page");
      return page;
    });
}
