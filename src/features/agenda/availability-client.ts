import { z } from "zod";
import { availabilityProposalSchema, availabilityReceiptSchema } from "./availability";
import { withJourneyDeadline } from "@/features/journey/request-deadline";
export class AvailabilityConflict extends Error {}
/** Keep original proposal/request ID after uncertainty. Browser scope grants no access. */
export function createAvailabilityClient(
  scope: { clinicId: string; doctorUserId: string; getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  return async (value: unknown) => {
    const input = availabilityProposalSchema.parse(value);
    return withJourneyDeadline(async (signal) => {
      const token = await scope.getAccessToken();
      if (signal.aborted) throw new Error("Availability request expired");
      if (!token) throw new Error("Session required");
      const response = await fetcher("/api/agenda/availability", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (response.status === 409) throw new AvailabilityConflict("Availability conflict");
      if (!response.ok) throw new Error("Availability unavailable");
      const { receipt } = z
        .object({ receipt: availabilityReceiptSchema })
        .strict()
        .parse(await response.json());
      if (
        receipt.clinicId !== scope.clinicId ||
        receipt.doctorUserId !== scope.doctorUserId ||
        receipt.sourceRequestId !== input.sourceRequestId ||
        Date.parse(receipt.interval.startsAt) !== Date.parse(input.interval.startsAt) ||
        Date.parse(receipt.interval.endsAt) !== Date.parse(input.interval.endsAt)
      )
        throw new Error("Unexpected availability receipt");
      return receipt;
    });
  };
}
