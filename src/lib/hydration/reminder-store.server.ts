import "@tanstack/react-start/server-only";
import type { createHydrationReminderWorker } from "./reminder-worker.server";
/** No default transport/role. Functions are owner-only until an explicit worker privilege design. */
export function createHydrationReminderStore(
  rpc: (
    name:
      | "tm_get_hydration_reminder_job"
      | "tm_claim_hydration_reminder"
      | "tm_transition_hydration_reminder",
    args: Record<string, unknown>,
  ) => Promise<unknown>,
) {
  type Providers = Parameters<typeof createHydrationReminderWorker>[0];
  const store: Pick<Providers, "read" | "claim" | "transition"> = {
    read: (id) => rpc("tm_get_hydration_reminder_job", { p_id: id }),
    claim: (job, attemptId) =>
      rpc("tm_claim_hydration_reminder", {
        p_id: job.id,
        p_expected_revision: job.revision,
        p_attempt_id: attemptId,
      }),
    transition: (job, change) =>
      rpc("tm_transition_hydration_reminder", {
        p_id: job.id,
        p_expected_revision: job.revision,
        p_attempt_id: job.attemptId,
        p_status: change.status,
        ...(change.reason !== null ? { p_reason: change.reason } : {}),
        ...(change.providerReceiptId !== null
          ? { p_provider_receipt_id: change.providerReceiptId }
          : {}),
      }),
  };
  return store;
}
