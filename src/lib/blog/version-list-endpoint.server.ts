import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import {
  blogVersionListQuerySchema,
  validateBlogVersionPage,
} from "@/features/blog/version-list-contract";
export function createBlogVersionListEndpoint<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  resolveSession: (request: Request) => Promise<S | null>;
  read: (
    session: S,
    args: { p_draft_id: string; p_limit: number; p_before?: number },
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
      const q = new URL(request.url).searchParams;
      if (
        request.body ||
        [...q.keys()].some(
          (k) => !["id", "before", "limit"].includes(k) || q.getAll(k).length !== 1,
        ) ||
        ["before", "limit"].some((k) => q.has(k) && !/^[1-9][0-9]{0,9}$/.test(q.get(k)!))
      )
        throw new AuthError("Invalid query", 400);
      const input = blogVersionListQuerySchema.safeParse({
        id: q.get("id"),
        ...(q.has("before") ? { before: Number(q.get("before")) } : {}),
        ...(q.has("limit") ? { limit: Number(q.get("limit")) } : {}),
      });
      if (!input.success) throw new AuthError("Invalid query", 400);
      const session = await providers.resolveSession(request);
      if (!session) throw new AuthError("Session required", 401);
      if (session.identity.globalRole !== "super_admin") throw new AuthError("Access denied", 403);
      const p = input.data;
      const page = validateBlogVersionPage(
        await providers.read(session, {
          p_draft_id: p.id,
          p_limit: p.limit,
          ...(p.before !== undefined ? { p_before: p.before } : {}),
        }),
        p,
      );
      return Response.json({ page }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      return Response.json(
        {
          error:
            status === 400
              ? "Consulta inválida"
              : status === 401
                ? "Entre novamente para continuar"
                : status === 403
                  ? "Acesso não autorizado"
                  : "Histórico temporariamente indisponível",
        },
        { status, headers },
      );
    }
  };
}
