import "@tanstack/react-start/server-only";
import type { createHydrationReminderPlanner } from "./reminder-planner.server";
/** Explicit trusted transport only. Neither RPC is available to application roles. */
export function createHydrationReminderPlanningStore(
  rpc: (
    name: "tm_list_hydration_reminder_candidates" | "tm_enqueue_hydration_reminder",
    args: Record<string, unknown>,
  ) => Promise<unknown>,
) {
  type Providers = Parameters<typeof createHydrationReminderPlanner>[0];
  const store: Pick<Providers, "list" | "enqueue"> = {
    list: ({ after, limit }) =>
      rpc("tm_list_hydration_reminder_candidates", {
        p_limit: limit,
        ...(after !== null ? { p_after: after } : {}),
      }),
    enqueue: ({ id, clinicId, patientId, scheduledAt }) =>
      rpc("tm_enqueue_hydration_reminder", {
        p_id: id,
        p_clinic_id: clinicId,
        p_patient_id: patientId,
        p_scheduled_at: scheduledAt,
      }),
  };
  return store;
}
