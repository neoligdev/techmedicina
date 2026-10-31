import "@tanstack/react-start/server-only";
import { z } from "zod";
import { hydrationSettingsSnapshotSchema } from "@/features/hydration/settings-contract";
import { hydrationReminderSlot } from "@/features/hydration/reminder-slot";
import { hydrationReminderJobSchema } from "@/features/hydration/reminder-job-contract";
const cursorSchema = z
  .string()
  .regex(/^[0-9a-f-]{36}:[0-9a-f-]{36}$/)
  .refine((v) => v.split(":").every((id) => z.string().uuid().safeParse(id).success));
const checkpointSchema = z
  .object({ minute: z.string().datetime({ offset: true }), after: cursorSchema.nullable() })
  .strict();
const pageSchema = z
  .object({
    items: z.array(hydrationSettingsSnapshotSchema).max(100),
    nextCursor: cursorSchema.nullable(),
  })
  .strict();
const key = (v: { clinicId: string; patientId: string }) =>
  `${v.clinicId.toLowerCase()}:${v.patientId.toLowerCase()}`;
/** Local reference only: trusted candidate source and atomic SQL enqueue must be injected. */
export function createHydrationReminderPlanner(providers: {
  now: () => string;
  list: (request: { after: string | null; limit: number }) => Promise<unknown>;
  enqueue: (request: {
    id: string;
    clinicId: string;
    patientId: string;
    scheduledAt: string;
  }) => Promise<unknown>;
  newJobId: () => string;
}) {
  return async (checkpointValue?: unknown) => {
    const clock = () => Date.parse(z.string().datetime({ offset: true }).parse(providers.now()));
    const start = clock(),
      minute = new Date(Math.floor(start / 60000) * 60000).toISOString();
    const checkpoint =
      checkpointValue === undefined
        ? { minute, after: null }
        : checkpointSchema.parse(checkpointValue);
    if (checkpoint.minute !== minute) throw new Error("Expired reminder planning checkpoint");
    const page = pageSchema.parse(await providers.list({ after: checkpoint.after, limit: 100 }));
    let previous = checkpoint.after;
    for (const item of page.items) {
      const current = key(item);
      if (previous !== null && current <= previous)
        throw new Error("Unordered reminder candidates");
      previous = current;
    }
    if (page.nextCursor !== null && (page.items.length !== 100 || page.nextCursor !== previous))
      throw new Error("Invalid reminder page cursor");
    let planned = 0;
    for (const item of page.items) {
      const instant = clock();
      if (instant < start || instant >= Date.parse(minute) + 60000)
        throw new Error("Reminder planning window closed");
      const slot = hydrationReminderSlot(item, minute);
      if (!slot) continue;
      const result = hydrationReminderJobSchema.parse(
        await providers.enqueue({
          id: z.string().uuid().parse(providers.newJobId()),
          clinicId: item.clinicId,
          patientId: item.patientId,
          scheduledAt: minute,
        }),
      );
      // SQL may return an earlier job for the same civil slot after a retry or DST repetition.
      if (key(result) !== key(item) || result.slotKey !== slot.key)
        throw new Error("Unexpected reminder occurrence");
      planned++;
    }
    // A failed batch returns no checkpoint; retry the original one against SQL occurrence uniqueness.
    return {
      scanned: page.items.length,
      planned,
      next: page.nextCursor === null ? null : { minute, after: page.nextCursor },
    };
  };
}
