import { z } from "zod";
import { hydrationSettingsSnapshotSchema } from "./settings-contract";
/** Foreground-only minute slot. No backlog, push request, intake inference or clinical advice. */
export function hydrationReminderSlot(snapshotValue: unknown, nowValue: unknown) {
  const snapshot = hydrationSettingsSnapshotSchema.parse(snapshotValue);
  const now = z.string().datetime({ offset: true }).parse(nowValue);
  if (!snapshot.settings.remindersEnabled) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: snapshot.settings.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((v) => v.type === type)!.value;
  const date = `${part("year")}-${part("month")}-${part("day")}`,
    time = `${part("hour")}:${part("minute")}`;
  if (!snapshot.settings.reminderTimes.includes(time)) return null;
  return {
    key: [snapshot.clinicId.toLowerCase(), snapshot.patientId.toLowerCase(), date, time].join(":"),
    localDate: date,
    localTime: time,
    timeZone: snapshot.settings.timeZone,
    preferencesRevision: snapshot.revision,
  };
}
