import "@tanstack/react-start/server-only";
import { z } from "zod";
import { AuthError } from "../auth/guards.server";
import type { pauseJourneyGoal } from "./goal-pause.server";
import { storedGoalSchema } from "./goal-pause.server";
import type { JourneyPreferenceRpc } from "./preference-handlers.server";
import type { submitJourneySelfReport } from "./submit-self-report.server";

type RpcName =
  | "tm_get_journey_preference"
  | "tm_set_journey_preference"
  | "tm_get_journey_goal_for_doctor"
  | "tm_pause_journey_goal"
  | "tm_submit_journey_self_report_for_clinic";
/** Inject only a transport bound to the Auth-verified request bearer, retaining RLS.
 * Use beneath the goal/preference service guards; this adapter does not grant access.
 */
export function createJourneyRpcRepository(
  transport: (
    name: RpcName,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>,
) {
  async function call(name: RpcName, args: Record<string, unknown>) {
    const { data, error } = await transport(name, args);
    if (error) {
      if (error.code === "40001" || error.code === "23505")
        throw new AuthError("Revision conflict", 409);
      if (error.code === "42501") throw new AuthError("Access denied", 403);
      if (error.code === "22023") throw new AuthError("Invalid input", 400);
      throw new Error("Journey unavailable");
    }
    return data;
  }
  const preferenceRpc: JourneyPreferenceRpc = (name, args) => call(name, args);
  const repository: Parameters<typeof pauseJourneyGoal>[2] = {
    read: async (context, goalId) => {
      if (!context.currentClinicId) throw new AuthError("Clinic required", 403);
      const result = z
        .object({
          goal: storedGoalSchema,
          patientLink: z
            .object({
              clinicId: z.string().uuid(),
              patientId: z.string().uuid(),
              isActive: z.literal(true),
            })
            .strict(),
        })
        .strict()
        .parse(
          await call("tm_get_journey_goal_for_doctor", {
            p_goal_id: goalId,
            p_clinic_id: context.currentClinicId,
          }),
        );
      if (
        result.goal.id !== goalId ||
        result.goal.clinic_id !== context.currentClinicId ||
        result.patientLink.clinicId !== context.currentClinicId ||
        result.patientLink.patientId !== result.goal.patient_id
      )
        throw new Error("Unexpected goal scope");
      return result;
    },
    pause: async (_context, args) => call("tm_pause_journey_goal", args),
  };
  const selfReportRpc: Parameters<typeof submitJourneySelfReport>[2] = (args) =>
    call("tm_submit_journey_self_report_for_clinic", args);
  return { preferenceRpc, repository, selfReportRpc };
}
