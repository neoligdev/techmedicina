import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { createJourneyHostSessionResolver } from "../journey/host-session.server";
import { readOwnAvailability, type AvailabilityReader } from "./availability-read.server";
/** Unmounted factory. Registry, session and same-bearer reader are server-owned. */
export function createAvailabilityReadEndpoint<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  lookup: (hostname: string) => Promise<unknown>;
  resolveSession: (request: Request) => Promise<S | null>;
  reader: (session: S) => AvailabilityReader;
}) {
  const resolve = createJourneyHostSessionResolver(
    "clinic_portal",
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
      const url = new URL(request.url);
      if (url.search.length > 4096) throw new AuthError("Invalid query", 400);
      const allowed = new Set(["start", "end", "limit", "afterStart", "afterId"]);
      for (const key of url.searchParams.keys()) {
        if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1)
          throw new AuthError("Invalid query", 400);
      }
      const params = url.searchParams;
      if (params.has("limit") && !/^[1-9]\d*$/.test(params.get("limit")!))
        throw new AuthError("Invalid limit", 400);
      if (params.has("afterStart") !== params.has("afterId"))
        throw new AuthError("Incomplete cursor", 400);
      const value = {
        window: { startsAt: params.get("start"), endsAt: params.get("end") },
        ...(params.has("limit") ? { limit: Number(params.get("limit")) } : {}),
        ...(params.has("afterId")
          ? { after: { id: params.get("afterId"), startsAt: params.get("afterStart") } }
          : {}),
      };
      const bound = await resolve(request);
      if (!bound) throw new AuthError("Session required", 401);
      const page = await readOwnAvailability(bound.context, value, providers.reader(bound.session));
      return Response.json({ page }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const message =
        status === 400
          ? "Consulta de horários inválida"
          : status === 401
            ? "Entre novamente para continuar"
            : status === 403
              ? "Acesso não autorizado"
              : "Disponibilidade temporariamente indisponível";
      return Response.json({ error: message }, { status, headers });
    }
  };
}
