import "@tanstack/react-start/server-only";
import {
  clinicRowsSchema,
  clinicCursorSchema,
  type ClinicCursor,
} from "../../features/auth/clinic-directory";
import { isAuthorized, type AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { resolveSupabaseContext } from "../auth/supabase-adapter.server";

export function createClinicDirectory<Context extends { identity: AuthenticatedIdentity }>(
  resolve: () => Promise<Context | null>,
  read: (context: Context, cursor?: ClinicCursor) => Promise<unknown>,
) {
  return async (request?: Request) => {
    const context = await resolve();
    if (!context) throw new AuthError("Sessão não confirmada", 401);
    if (!isAuthorized({ identity: context.identity }, "cadastro_clinica", "read")) {
      throw new AuthError("Acesso administrativo não autorizado", 403);
    }
    let cursor: ClinicCursor | undefined;
    if (request) {
      const params = new URL(request.url).searchParams;
      if (params.size) {
        const parsed = clinicCursorSchema.safeParse(Object.fromEntries(params));
        if (
          !parsed.success ||
          params.size !== 2 ||
          params.getAll("before").length !== 1 ||
          params.getAll("beforeId").length !== 1
        )
          throw new AuthError("Cursor de consulta inválido", 400);
        cursor = parsed.data;
      }
    }
    const rows = clinicRowsSchema.parse(await read(context, cursor));
    const clinics = rows.slice(0, 100);
    const last = clinics.at(-1);
    return {
      clinics,
      hasMore: rows.length > 100,
      nextCursor: rows.length > 100 && last ? { before: last.created_at, beforeId: last.id } : null,
    };
  };
}

export const listPlatformClinics = createClinicDirectory(
  resolveSupabaseContext,
  async ({ client }, cursor) => {
    // Request-bound publishable client retains RLS; never use service_role for this read.
    let query = client
      .from("tm_clinics")
      .select("id,name,is_active,created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(101);
    if (cursor)
      query = query.or(
        `created_at.lt.${cursor.before},and(created_at.eq.${cursor.before},id.lt.${cursor.beforeId})`,
      );
    const result = await query;
    if (result.error) throw new Error("Cadastro temporariamente indisponível");
    return result.data;
  },
);

export function createClinicDirectoryResponse(list: typeof listPlatformClinics) {
  return async (request?: Request) => {
    const headers = { "Cache-Control": "private, no-store" };
    try {
      return Response.json(await list(request), { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      return Response.json(
        {
          error:
            status === 401
              ? "Sessão não confirmada"
              : status === 403
                ? "Acesso administrativo não autorizado"
                : status === 400
                  ? "Cursor de consulta inválido"
                  : "Cadastro temporariamente indisponível",
        },
        { status, headers },
      );
    }
  };
}
export const clinicDirectoryResponse = createClinicDirectoryResponse(listPlatformClinics);
