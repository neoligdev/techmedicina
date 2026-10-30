import { z } from "zod";
import { hydrationRecordSchema, hydrationScopeSchema, hydrationWindowSchema } from "./contracts";
function occursAfter(value: string, reference: string) {
  const a = Date.parse(value),
    b = Date.parse(reference);
  if (a !== b) return a > b;
  const tail = (v: string) => v.match(/\.(\d+)/)?.[1]?.slice(3) ?? "";
  const x = tail(value),
    y = tail(reference),
    n = Math.max(x.length, y.length);
  return x.padEnd(n, "0") > y.padEnd(n, "0");
}
export interface HydrationBucket {
  key: string;
  recordedMl: number | null;
  recordCount: number;
  evidence: "missing" | "recorded";
}
/** Projects current authorized snapshots; asOf filters occurrence, not historical revisions. */
export function projectHydration(scopeValue: unknown, recordsValue: unknown, windowValue: unknown) {
  const scope = hydrationScopeSchema.parse(scopeValue),
    records = z.array(hydrationRecordSchema).max(100000).parse(recordsValue),
    window = hydrationWindowSchema.parse(windowValue);
  if (new Set(records.map((r) => r.id)).size !== records.length)
    throw new Error("Duplicate hydration snapshot");
  if (records.some((r) => r.clinicId !== scope.clinicId || r.patientId !== scope.patientId))
    throw new Error("Unexpected hydration scope");
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: window.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localDate = (instant: string) => {
    const parts = formatter.formatToParts(new Date(instant));
    return ["year", "month", "day"].map((k) => parts.find((p) => p.type === k)!.value).join("-");
  };
  const anchor = localDate(window.asOf),
    year = Number(anchor.slice(0, 4)),
    month = Number(anchor.slice(5, 7)),
    day = Number(anchor.slice(8, 10));
  if (year < 1000 || year > 9999) throw new Error("Unsupported calendar year");
  const shift = (offset: number) =>
    new Date(Date.UTC(year, month - 1, day + offset, 12)).toISOString().slice(0, 10);
  let keys: string[];
  switch (window.period) {
    case "day":
      keys = [anchor];
      break;
    case "week":
      keys = Array.from({ length: 7 }, (_, i) => shift(i - 6));
      break;
    case "month":
      keys = Array.from(
        { length: day },
        (_, i) => anchor.slice(0, 8) + String(i + 1).padStart(2, "0"),
      );
      break;
    case "year":
      keys = Array.from(
        { length: month },
        (_, i) => String(year) + "-" + String(i + 1).padStart(2, "0"),
      );
      break;
  }
  const buckets: HydrationBucket[] = keys.map((key) => ({
    key,
    recordedMl: null,
    recordCount: 0,
    evidence: "missing",
  }));
  const index = new Map(buckets.map((b) => [b.key, b]));
  let totalRecordedMl: number | null = null,
    recordCount = 0;
  for (const record of records) {
    if (record.status === "voided" || occursAfter(record.occurredAt, window.asOf)) continue;
    const date = localDate(record.occurredAt),
      key = window.period === "year" ? date.slice(0, 7) : date,
      bucket = index.get(key);
    if (!bucket) continue;
    const nextBucket: number = (bucket.recordedMl ?? 0) + record.volumeMl,
      nextTotal: number = (totalRecordedMl ?? 0) + record.volumeMl;
    if (!Number.isSafeInteger(nextBucket) || !Number.isSafeInteger(nextTotal))
      throw new Error("Hydration sum exceeds exact integer range");
    bucket.recordedMl = nextBucket;
    bucket.recordCount++;
    bucket.evidence = "recorded";
    totalRecordedMl = nextTotal;
    recordCount++;
  }
  return {
    ...scope,
    period: window.period,
    timeZone: window.timeZone,
    asOf: window.asOf,
    unit: "mL" as const,
    buckets,
    totalRecordedMl,
    recordCount,
  };
}
