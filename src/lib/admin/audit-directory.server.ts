import "@tanstack/react-start/server-only";
import {
  administrativeAuditRowsSchema,
  auditCursorSchema,
  type AuditCursor,
} from "../../features/auth/administrative-audit";
import { isAuthorized, type AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { resolveSupabaseContext } from "../auth/supabase-adapter.server";

export function createAuditDirectory<Context extends { identity: AuthenticatedIdentity }>(
  resolve: () => Promise<Context | null>,
  read: (context: Context, cursor?: AuditCursor) => Promise<unknown>,
) {
  return async (request?: Request) => {
    const headers = { "Cache-Control": "private, no-store" };
    try {
      const context = await resolve();
      if (!context) throw new AuthError("Sessão não confirmada", 401);
      if (!isAuthorized({ identity: context.identity }, "cadastro_clinica", "read"))
        throw new AuthError("Consulta global de auditoria não autorizada", 403);
      let cursor: AuditCursor | undefined;
      if (request) {
        const params = new URL(request.url).searchParams;
        if (params.size) {
          if (
            params.size !== 2 ||
            params.getAll("before").length !== 1 ||
            params.getAll("beforeId").length !== 1
          )
            throw new AuthError("Cursor de consulta inválido", 400);
          const parsed = auditCursorSchema.safeParse(Object.fromEntries(params));
          if (!parsed.success) throw new AuthError("Cursor de consulta inválido", 400);
          cursor = parsed.data;
        }
      }
      const rows = administrativeAuditRowsSchema.parse(await read(context, cursor));
      const events = rows.slice(0, 100);
      const last = events.at(-1);
      return Response.json(
        {
          events,
          hasMore: rows.length > 100,
          nextCursor:
            rows.length > 100 && last ? { before: last.occurred_at, beforeId: last.id } : null,
        },
        { headers },
      );
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof AuthError ? error.message : "Auditoria temporariamente indisponível",
        },
        { status: error instanceof AuthError ? error.status : 503, headers },
      );
    }
  };
}
export const auditDirectoryResponse = createAuditDirectory(
  resolveSupabaseContext,
  async ({ client }, cursor) => {
    let query = client
      .from("tm_admin_audit")
      .select("id,actor_user_id,clinic_id,action,changed_fields,occurred_at")
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(101);
    if (cursor)
      query = query.or(
        `occurred_at.lt.${cursor.before},and(occurred_at.eq.${cursor.before},id.lt.${cursor.beforeId})`,
      );
    const result = await query;
    if (result.error) throw new Error("Unavailable");
    return result.data;
  },
);
