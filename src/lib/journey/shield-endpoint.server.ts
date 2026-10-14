import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { createJourneyHostSessionResolver } from "./host-session.server";
import { readOwnShields } from "./shield-read.server";

/** Unmounted composition; same-session repository must use request bearer and RLS. */
export function createOwnShieldEndpoint<S extends { identity: AuthenticatedIdentity }>(providers: {
  lookup: (hostname: string) => Promise<unknown>;
  resolveSession: (request: Request) => Promise<S | null>;
  read: (session: S) => Parameters<typeof readOwnShields>[1];
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
      if (new URL(request.url).searchParams.size || request.body)
        throw new AuthError("Unexpected input", 400);
      const bound = await resolve(request);
      if (!bound) throw new AuthError("Session required", 401);
      const overview = await readOwnShields(bound.context, providers.read(bound.session));
      return Response.json({ overview }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Consulta inválida",
        401: "Entre novamente para continuar",
        403: "Acesso não autorizado",
      };
      return Response.json(
        { error: messages[status] ?? "Escudos temporariamente indisponíveis" },
        { status, headers },
      );
    }
  };
}
