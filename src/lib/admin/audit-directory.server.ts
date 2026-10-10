import "@tanstack/react-start/server-only";
import { administrativeAuditRowsSchema } from "../../features/auth/administrative-audit";
import { isAuthorized, type AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { resolveSupabaseContext } from "../auth/supabase-adapter.server";

export function createAuditDirectory<Context extends { identity: AuthenticatedIdentity }>(
  resolve: () => Promise<Context | null>,
  read: (context: Context) => Promise<unknown>,
) {
  return async () => {
    const headers = { "Cache-Control": "private, no-store" };
    try {
      const context = await resolve();
      if (!context) throw new AuthError("Sessão não confirmada", 401);
      if (!isAuthorized({ identity: context.identity }, "cadastro_clinica", "read"))
        throw new AuthError("Consulta global de auditoria não autorizada", 403);
      const rows = administrativeAuditRowsSchema.parse(await read(context));
      return Response.json({ events: rows.slice(0, 100), hasMore: rows.length > 100 }, { headers });
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
  async ({ client }) => {
    const result = await client
      .from("tm_admin_audit")
      .select("id,actor_user_id,clinic_id,action,changed_fields,occurred_at")
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(101);
    if (result.error) throw new Error("Unavailable");
    return result.data;
  },
);
