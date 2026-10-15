import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { createJourneyHostSessionResolver } from "../journey/host-session.server";
import { readJourneyJson } from "../journey/json-input.server";
import { createOwnAvailability, type AvailabilityRpc } from "./availability-write.server";
/** Unmounted. Reuses bounded JSON and verified clinic host/session, no service-role. */
export function createAvailabilityEndpoint<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  lookup: (hostname: string) => Promise<unknown>;
  resolveSession: (request: Request) => Promise<S | null>;
  rpc: (session: S) => AvailabilityRpc;
}) {
  const resolve = createJourneyHostSessionResolver(
    "clinic_portal",
    providers.lookup,
    providers.resolveSession,
  );
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store", Vary: "Authorization, Host" };
    try {
      if (request.method !== "POST")
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: "POST" } },
        );
      if (new URL(request.url).searchParams.size) throw new AuthError("Unexpected query", 400);
      const bound = await resolve(request);
      if (!bound) throw new AuthError("Session required", 401);
      const receipt = await createOwnAvailability(
        bound.context,
        await readJourneyJson(request),
        providers.rpc(bound.session),
      );
      return Response.json({ receipt }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Horário inválido",
        401: "Entre novamente para continuar",
        403: "Acesso não autorizado",
        409: "Há conflito neste horário. Verifique sua disponibilidade antes de reenviar.",
        413: "Dados excedem o limite",
        415: "Envie dados JSON",
      };
      return Response.json(
        { error: messages[status] ?? "Disponibilidade temporariamente indisponível" },
        { status, headers },
      );
    }
  };
}
