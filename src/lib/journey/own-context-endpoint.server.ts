import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { createJourneyHostSessionResolver } from "./host-session.server";
import { ownJourneyContextSchema } from "@/features/journey/own-context";
/** Local composition; registry must revalidate active host and session retains the request bearer. */
export function createOwnJourneyContextEndpoint<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  lookup: (hostname: string) => Promise<unknown>;
  resolveSession: (request: Request) => Promise<S | null>;
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
      const link = bound.context.identity.links[0];
      if (
        !link ||
        !link.grants.some(
          (grant) => grant.resource.startsWith("journey_") && grant.action === "read",
        )
      )
        throw new AuthError("Journey access denied", 403);
      const scope = ownJourneyContextSchema.parse({
        clinicId: bound.context.currentClinicId,
        patientId: link.patientId,
      });
      return Response.json({ scope }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Consulta inválida",
        401: "Entre novamente para continuar",
        403: "Acesso não autorizado",
      };
      return Response.json(
        { error: messages[status] ?? "Contexto temporariamente indisponível" },
        { status, headers },
      );
    }
  };
}
