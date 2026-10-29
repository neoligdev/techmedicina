import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import {
  deviceRegistrationListQuerySchema,
  deviceRegistrationListPageSchema,
} from "@/features/devices/registration-list-contract";
export function createDeviceRegistrationListEndpoint<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  resolveSession: (request: Request) => Promise<S | null>;
  read: (
    session: S,
    args: { p_query: string; p_limit: number; p_after?: string },
  ) => Promise<unknown>;
}) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
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
          (k) => !["q", "after", "limit"].includes(k) || query.getAll(k).length !== 1,
        )
      )
        throw new AuthError("Invalid query", 400);
      const input = deviceRegistrationListQuerySchema.safeParse({
        ...(query.has("q") ? { q: query.get("q") } : {}),
        ...(query.has("after") ? { after: query.get("after") } : {}),
        ...(query.has("limit") ? { limit: Number(query.get("limit")) } : {}),
      });
      if (!input.success || (query.has("limit") && !/^[1-9][0-9]?$/.test(query.get("limit")!)))
        throw new AuthError("Invalid query", 400);
      const session = await providers.resolveSession(request);
      if (!session) throw new AuthError("Session required", 401);
      if (session.identity.globalRole !== "super_admin") throw new AuthError("Access denied", 403);
      const value = input.data;
      const page = deviceRegistrationListPageSchema.parse(
        await providers.read(session, {
          p_query: value.q,
          p_limit: value.limit,
          ...(value.after ? { p_after: value.after } : {}),
        }),
      );
      if (
        page.query !== value.q ||
        page.items.length > value.limit ||
        (page.nextCursor !== null && page.items.length !== value.limit) ||
        page.items.some((i) => value.after && i.id.toLowerCase() <= value.after.toLowerCase())
      )
        throw new Error("Unexpected page");
      return Response.json({ page }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Consulta inválida",
        401: "Entre novamente para continuar",
        403: "Acesso não autorizado",
      };
      return Response.json(
        { error: messages[status] ?? "Biblioteca temporariamente indisponível" },
        { status, headers },
      );
    }
  };
}
