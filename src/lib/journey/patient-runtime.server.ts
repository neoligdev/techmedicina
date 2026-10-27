import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { createJourneyEndpoints } from "./endpoints.server";
import { createJourneyRpcRepository } from "./rpc-repository.server";
import { createOwnShieldEndpoint } from "./shield-endpoint.server";
import { createOwnShieldRpcReader } from "./shield-rpc-reader.server";
import { createOwnJourneyContextEndpoint } from "./own-context-endpoint.server";
import { createSelfReportHistoryEndpoint } from "./self-report-history-endpoint.server";

import { createOwnGoalsEndpoint } from "./own-goals-endpoint.server";

import { createSelfReportStatusEndpoint } from "./self-report-status-endpoint.server";

type JourneyRpcName =
  | "tm_get_own_journey_self_report"
  | "tm_get_own_journey_goals"
  | "tm_get_own_journey_self_reports"
  | "tm_resolve_patient_journey_host"
  | "tm_get_patient_shield_overview"
  | "tm_get_journey_preference"
  | "tm_set_journey_preference"
  | "tm_get_journey_goal_for_doctor"
  | "tm_pause_journey_goal"
  | "tm_submit_journey_self_report_for_clinic"
  | "tm_create_journey_goal_draft";
import { selfReportAccessSchema } from "@/features/journey/self-report-access-client";

export type PatientJourneyOperation =
  | "selfReportStatus"
  | "selfReportAccess"
  | "participationRead"
  | "participationSave"
  | "ownGoals"
  | "context"
  | "shields"
  | "selfReport"
  | "selfReportHistory";
/** Every call owns its session promise; no cross-request identity, bearer or tenant cache. */
export function createPatientJourneyRuntime<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  resolveSession: (request: Request) => Promise<S | null>;
  rpc: (session: S, name: JourneyRpcName, args: Record<string, unknown>) => Promise<unknown>;
}) {
  return async (operation: PatientJourneyOperation, request: Request) => {
    let sessionPromise: Promise<S | null> | undefined;
    const resolveSession = () => (sessionPromise ??= providers.resolveSession(request));
    const lookup = async (hostname: string) => {
      const session = await resolveSession();
      if (!session) throw new AuthError("Session required", 401);
      return providers.rpc(session, "tm_resolve_patient_journey_host", { p_hostname: hostname });
    };
    const repository = (session: S) =>
      createJourneyRpcRepository(async (name, args) => ({
        data: await providers.rpc(session, name, args),
        error: null,
      }));
    if (operation === "context")
      return createOwnJourneyContextEndpoint({ lookup, resolveSession })(request);
    if (operation === "shields")
      return createOwnShieldEndpoint({
        lookup,
        resolveSession,
        read: (session) =>
          createOwnShieldRpcReader(session.identity.userId, async (name, args) => ({
            data: await providers.rpc(session, name, args),
            error: null,
          })),
      })(request);
    if (operation === "ownGoals")
      return createOwnGoalsEndpoint({
        lookup,
        resolveSession,
        read: (session, args) => providers.rpc(session, "tm_get_own_journey_goals", args),
      })(request);
    if (operation === "selfReportStatus")
      return createSelfReportStatusEndpoint({
        lookup,
        resolveSession,
        read: (session, args) => providers.rpc(session, "tm_get_own_journey_self_report", args),
      })(request);
    if (operation === "selfReportHistory")
      return createSelfReportHistoryEndpoint({
        lookup,
        resolveSession,
        read: (session, args) => providers.rpc(session, "tm_get_own_journey_self_reports", args),
      })(request);
    const endpoints = createJourneyEndpoints({
      lookup,
      resolveSession,
      preferenceRpc: (session) => repository(session).preferenceRpc,
      goalRepository: (session) => repository(session).repository,
      selfReportRpc: (session) => repository(session).selfReportRpc,
    });
    if (operation === "selfReportAccess") {
      const result = await endpoints.participation.GET(request);
      if (!result.ok) return result;
      try {
        const { preference } = await result.json();
        const session = await resolveSession();
        const link = session?.identity.links.find(
          (l) =>
            l.isActive &&
            l.role === "paciente" &&
            l.clinicId === preference.clinicId &&
            l.patientId === preference.patientId,
        );
        const canSubmit = Boolean(
          preference.isEnabled &&
          link?.grants.some((g) => g.resource === "journey_events" && g.action === "create"),
        );
        return Response.json(selfReportAccessSchema.parse({ preference, canSubmit }), {
          headers: result.headers,
        });
      } catch {
        return Response.json(
          { error: "Disponibilidade temporariamente indisponível" },
          { status: 503, headers: result.headers },
        );
      }
    }
    if (operation === "participationRead") return endpoints.participation.GET(request);
    if (operation === "participationSave") return endpoints.participation.PUT(request);
    return endpoints.selfReport(request);
  };
}
