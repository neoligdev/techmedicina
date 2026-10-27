import "@tanstack/react-start/server-only";
import { AuthError } from "../auth/guards.server";
import type { AuthenticatedIdentity } from "../auth/core";
import { createJourneyHostSessionResolver } from "./host-session.server";
import {
  selfReportHistoryQuerySchema,
  selfReportHistoryPageSchema,
} from "@/features/journey/self-report-history";
/** Host/session determines clinic and own patient. No patient/actor from the query. */
export function createSelfReportHistoryEndpoint<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  lookup: (hostname: string) => Promise<unknown>;
  resolveSession: (request: Request) => Promise<S | null>;
  read: (
    session: S,
    args: { p_clinic_id: string; p_before?: string; p_limit: number },
  ) => Promise<unknown>;
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
        [...query.keys()].some(
          (key) => !["before", "limit"].includes(key) || query.getAll(key).length !== 1,
        )
      )
        throw new AuthError("Invalid query", 400);
      const value = selfReportHistoryQuerySchema.safeParse({
        ...(query.has("before") ? { before: query.get("before") } : {}),
        ...(query.has("limit") ? { limit: Number(query.get("limit")) } : {}),
      });
      if (!value.success || (query.has("limit") && !/^[1-9][0-9]{0,2}$/.test(query.get("limit")!)))
        throw new AuthError("Invalid query", 400);
      const bound = await resolve(request);
      if (!bound) throw new AuthError("Session required", 401);
      const link = bound.context.identity.links[0];
      if (
        !link?.patientId ||
        !link.grants.some((g) => g.resource === "journey_events" && g.action === "read")
      )
        throw new AuthError("History denied", 403);
      const args = {
        p_clinic_id: bound.context.currentClinicId!,
        p_limit: value.data.limit,
        ...(value.data.before ? { p_before: value.data.before } : {}),
      };
      const page = selfReportHistoryPageSchema.parse(await providers.read(bound.session, args));
      if (
        page.clinicId !== bound.context.currentClinicId ||
        page.patientId !== link.patientId ||
        page.events.length > value.data.limit ||
        page.events.some((e) => e.id === value.data.before) ||
        (page.nextCursor !== null && page.events.length !== value.data.limit)
      )
        throw new Error("Invalid history scope");
      return Response.json({ page }, { headers });
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
