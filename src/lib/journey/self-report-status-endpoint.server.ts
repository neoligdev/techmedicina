import "@tanstack/react-start/server-only";
import { AuthError } from "../auth/guards.server";
import type { AuthenticatedIdentity } from "../auth/core";
import { createJourneyHostSessionResolver } from "./host-session.server";
import {
  selfReportStatusQuerySchema,
  selfReportStatusSchema,
} from "@/features/journey/self-report-status";
/** Host/session determines clinic and own patient. No patient/actor from the query. */
export function createSelfReportStatusEndpoint<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  lookup: (hostname: string) => Promise<unknown>;
  resolveSession: (request: Request) => Promise<S | null>;
  read: (session: S, args: { p_clinic_id: string; p_source_event_id: string }) => Promise<unknown>;
}) {
  const resolve = createJourneyHostSessionResolver(
    "patient_pwa",
    providers.lookup,
    providers.resolveSession,
  );
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store", Vary: "Authorization, Host" };
    try {
      if (request.method !== "GET")
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: "GET" } },
        );
      const query = new URL(request.url).searchParams;
      if (
        request.body ||
        [...query.keys()].some((key) => key !== "sourceEventId" || query.getAll(key).length !== 1)
      )
        throw new AuthError("Invalid query", 400);
      const value = selfReportStatusQuerySchema.safeParse({
        sourceEventId: query.get("sourceEventId"),
      });
      if (!value.success) throw new AuthError("Invalid query", 400);
      const bound = await resolve(request);
      if (!bound) throw new AuthError("Session required", 401);
      const link = bound.context.identity.links[0];
      if (
        !link?.patientId ||
        !link.grants.some((g) => g.resource === "journey_events" && g.action === "read")
      )
        throw new AuthError("History denied", 403);
      const report = selfReportStatusSchema.parse(
        await providers.read(bound.session, {
          p_clinic_id: bound.context.currentClinicId!,
          p_source_event_id: value.data.sourceEventId,
        }),
      );
      if (
        report.clinicId !== bound.context.currentClinicId ||
        report.patientId !== link.patientId ||
        (report.event && report.event.sourceEventId !== value.data.sourceEventId)
      )
        throw new Error("Invalid report scope");
      return Response.json({ report }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Consulta inválida",
        401: "Entre novamente para continuar",
        403: "Acesso não autorizado",
      };
      return Response.json(
        { error: messages[status] ?? "Histórico temporariamente indisponível" },
        { status, headers },
      );
    }
  };
}
