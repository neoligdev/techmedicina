import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { ownAvailabilityScope } from "./availability.server";
import { availabilityPageQuerySchema } from "@/features/agenda/availability-page";
import { availabilityReceiptSchema } from "@/features/agenda/availability";
type Cursor = { startsAt: string; id: string };
type Selection = {
  clinicId: string;
  doctorUserId: string;
  startsAt: string;
  endsAt: string;
  take: number;
  after?: Cursor | undefined;
};
export type AvailabilityReader = (selection: Selection) => Promise<unknown>;
function compare(a: Cursor, b: Cursor) {
  return (
    Date.parse(a.startsAt) - Date.parse(b.startsAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}
/** Injected same-bearer reader must filter/order/limit under RLS; no active endpoint. */
export async function readOwnAvailability(
  context: AuthContext,
  value: unknown,
  read: AvailabilityReader,
) {
  const scope = ownAvailabilityScope(context, "read");
  const parsed = availabilityPageQuerySchema.safeParse(value);
  if (!parsed.success) throw new AuthError("Invalid availability query", 400);
  const query = parsed.data;
  const rows = z
    .array(availabilityReceiptSchema)
    .max(query.limit + 1)
    .parse(
      await read({
        ...scope,
        startsAt: new Date(query.window.startsAt).toISOString(),
        endsAt: new Date(query.window.endsAt).toISOString(),
        take: query.limit + 1,
        after: query.after
          ? { id: query.after.id, startsAt: new Date(query.after.startsAt).toISOString() }
          : undefined,
      }),
    );
  let previous = query.after;
  const seen = new Set<string>();
  for (const row of rows) {
    const cursor = { id: row.id, startsAt: row.interval.startsAt };
    if (
      row.clinicId !== scope.clinicId ||
      row.doctorUserId !== scope.doctorUserId ||
      Date.parse(cursor.startsAt) < Date.parse(query.window.startsAt) ||
      Date.parse(cursor.startsAt) >= Date.parse(query.window.endsAt) ||
      (previous && compare(cursor, previous) <= 0) ||
      seen.has(row.id)
    )
      throw new Error("Unexpected availability page");
    previous = cursor;
    seen.add(row.id);
  }
  const items = rows.slice(0, query.limit).map((row) => ({
    ...row,
    interval: {
      startsAt: new Date(row.interval.startsAt).toISOString(),
      endsAt: new Date(row.interval.endsAt).toISOString(),
    },
    createdAt: new Date(row.createdAt).toISOString(),
  }));
  const last = items.at(-1);
  return {
    ...scope,
    items,
    next:
      rows.length > query.limit && last ? { id: last.id, startsAt: last.interval.startsAt } : null,
  };
}
