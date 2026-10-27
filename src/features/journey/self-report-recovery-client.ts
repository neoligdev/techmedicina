import { journeySelfReportInputSchema } from "./contracts";
import { createOwnSelfReportHistoryClient } from "./self-report-history-client";
import { JourneySelfReportConflict, journeySelfReportReceiptSchema } from "./self-report-client";
/** A bounded read can confirm a committed write. Absence never proves that it failed. */
export function createSelfReportRecoveryClient(
  scope: { clinicId: string; patientId: string; getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  const read = createOwnSelfReportHistoryClient(scope, fetcher);
  return async (value: unknown) => {
    const input = journeySelfReportInputSchema.parse(value);
    const page = await read({ limit: 100 });
    const saved = page.events.find((e) => e.sourceEventId === input.sourceEventId);
    if (!saved) return null;
    if (
      saved.goalId !== input.goalId ||
      timestampKey(saved.occurredAt) !== timestampKey(input.occurredAt)
    )
      throw new JourneySelfReportConflict();
    return journeySelfReportReceiptSchema.parse({
      id: saved.id,
      clinicId: scope.clinicId,
      patientId: scope.patientId,
      goalId: saved.goalId,
      sourceEventId: saved.sourceEventId,
      occurredAt: new Date(saved.occurredAt).toISOString(),
    });
  };
}

// Keep sub-millisecond precision for conflict detection; trailing zeroes and offsets are equivalent.
function timestampKey(value: string) {
  const fraction = /\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/.exec(value)?.[1] ?? "";
  return Math.floor(Date.parse(value) / 1000) + ":" + fraction.replace(/0+$/, "");
}
