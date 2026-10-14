import { z } from "zod";
import { journeySelfReportInputSchema } from "./contracts";
import { withJourneyDeadline } from "./request-deadline";
const responseSchema = z
  .object({
    receipt: z
      .object({
        id: z.string().uuid(),
        clinicId: z.string().uuid(),
        patientId: z.string().uuid(),
        goalId: z.string().uuid(),
        sourceEventId: z.string().uuid(),
        occurredAt: z.string().datetime(),
      })
      .strict(),
  })
  .strict();
export const journeySelfReportReceiptSchema = responseSchema.shape.receipt;
export class JourneySelfReportConflict extends Error {
  constructor() {
    super("Self-report conflict");
  }
}
/** Retain the original input/event ID when retrying an uncertain write.
 * Browser scope checks responses only; host/Auth/RPC enforce actual authorization.
 */
export function createJourneySelfReportClient(
  scope: { clinicId: string; patientId: string; getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  return async (value: unknown) => {
    const input = journeySelfReportInputSchema.parse(value);
    return withJourneyDeadline(async (signal) => {
      const token = await scope.getAccessToken();
      if (signal.aborted) throw new Error("Journey request expired");
      if (!token) throw new Error("Session required");
      const response = await fetcher("/api/journey/self-report", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (response.status === 409) throw new JourneySelfReportConflict();
      if (!response.ok) throw new Error("Self-report unavailable");
      const { receipt } = responseSchema.parse(await response.json());
      if (
        receipt.clinicId !== scope.clinicId ||
        receipt.patientId !== scope.patientId ||
        receipt.goalId !== input.goalId ||
        receipt.sourceEventId !== input.sourceEventId ||
        Date.parse(receipt.occurredAt) !== Date.parse(input.occurredAt)
      )
        throw new Error("Unexpected self-report receipt");
      return receipt;
    });
  };
}
