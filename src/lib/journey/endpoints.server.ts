import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "../auth/core";
import { createJourneyHostSessionResolver } from "./host-session.server";
import {
  createJourneyPreferenceHandlers,
  type JourneyPreferenceRpc,
} from "./preference-handlers.server";
import { createJourneyGoalReadHandler } from "./goal-read-handler.server";
import { createJourneyGoalPauseHandler } from "./goal-pause-handler.server";
import type { pauseJourneyGoal } from "./goal-pause.server";
import type { submitJourneySelfReport } from "./submit-self-report.server";
import { createJourneySelfReportHandler } from "./self-report-handler.server";

/** Unmounted local composition. Providers must retain the verified request session,
 * enforce RPC/RLS and never use a service-role key to bypass tenant authorization.
 */
export function createJourneyEndpoints<S extends { identity: AuthenticatedIdentity }>(providers: {
  lookup: (hostname: string) => Promise<unknown>;
  resolveSession: (request: Request) => Promise<S | null>;
  preferenceRpc: (session: S) => JourneyPreferenceRpc;
  goalRepository: (session: S) => Parameters<typeof pauseJourneyGoal>[2];
  selfReportRpc: (session: S) => Parameters<typeof submitJourneySelfReport>[2];
}) {
  const patient = createJourneyHostSessionResolver(
    "patient_pwa",
    providers.lookup,
    providers.resolveSession,
  );
  const doctor = createJourneyHostSessionResolver(
    "clinic_portal",
    providers.lookup,
    providers.resolveSession,
  );
  const participation = createJourneyPreferenceHandlers(async (request) => {
    const bound = await patient(request);
    return bound ? { context: bound.context, rpc: providers.preferenceRpc(bound.session) } : null;
  });
  const goals = createJourneyGoalReadHandler(async (request) => {
    const bound = await doctor(request);
    return bound
      ? { context: bound.context, read: providers.goalRepository(bound.session).read }
      : null;
  });
  const pause = createJourneyGoalPauseHandler(async (request) => {
    const bound = await doctor(request);
    return bound
      ? { context: bound.context, repository: providers.goalRepository(bound.session) }
      : null;
  });
  const selfReport = createJourneySelfReportHandler(async (request) => {
    const bound = await patient(request);
    return bound ? { context: bound.context, rpc: providers.selfReportRpc(bound.session) } : null;
  });
  return { participation, goals, pause, selfReport };
}
