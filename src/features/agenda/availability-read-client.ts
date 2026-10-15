import { z } from "zod";
import { availabilityPageQuerySchema, availabilityPageSchema } from "./availability-page";
import { withJourneyDeadline } from "@/features/journey/request-deadline";
type Scope = { clinicId: string; doctorUserId: string };
export function validateAvailabilityPage(value: unknown, input: unknown, scope: Scope) {
  const query = availabilityPageQuerySchema.parse(input),
    page = availabilityPageSchema.parse(value);
  if (
    page.clinicId !== scope.clinicId ||
    page.doctorUserId !== scope.doctorUserId ||
    page.items.length > query.limit
  )
    throw new Error("Unexpected availability scope");
  let previous = query.after;
  const ids = new Set<string>();
  for (const item of page.items) {
    const current = { id: item.id, startsAt: item.interval.startsAt };
    const order = previous
      ? Date.parse(current.startsAt) - Date.parse(previous.startsAt) ||
        (current.id < previous.id ? -1 : current.id > previous.id ? 1 : 0)
      : 1;
    if (
      item.clinicId !== scope.clinicId ||
      item.doctorUserId !== scope.doctorUserId ||
      ids.has(item.id) ||
      order <= 0 ||
      Date.parse(current.startsAt) < Date.parse(query.window.startsAt) ||
      Date.parse(current.startsAt) >= Date.parse(query.window.endsAt)
    )
      throw new Error("Unexpected availability page");
    ids.add(item.id);
    previous = current;
  }
  const last = page.items.at(-1);
  if (
    page.next &&
    (!last ||
      page.items.length !== query.limit ||
      page.next.id !== last.id ||
      Date.parse(page.next.startsAt) !== Date.parse(last.interval.startsAt))
  )
    throw new Error("Unexpected availability cursor");
  return page;
}
export function createAvailabilityReadClient(
  scope: Scope & { getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  return async (value: unknown) => {
    const input = availabilityPageQuerySchema.parse(value);
    return withJourneyDeadline(async (signal) => {
      const token = await scope.getAccessToken();
      if (!token || signal.aborted) throw new Error("Session unavailable");
      const params = new URLSearchParams({
        start: input.window.startsAt,
        end: input.window.endsAt,
        limit: String(input.limit),
      });
      if (input.after) {
        params.set("afterStart", input.after.startsAt);
        params.set("afterId", input.after.id);
      }
      const response = await fetcher(`/api/agenda/availability?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        signal,
      });
      if (!response.ok) throw new Error("Availability unavailable");
      const body = z
        .object({ page: z.unknown() })
        .strict()
        .parse(await response.json());
      return validateAvailabilityPage(body.page, input, scope);
    });
  };
}
