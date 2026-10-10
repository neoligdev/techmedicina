import "@tanstack/react-start/server-only";
import { clinicRowsSchema } from "../../features/auth/clinic-directory";
import { isAuthorized, type AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { resolveSupabaseContext } from "../auth/supabase-adapter.server";

export function createClinicDirectory<Context extends { identity: AuthenticatedIdentity }>(
  resolve: () => Promise<Context | null>,
  read: (context: Context) => Promise<unknown>,
) {
  return async () => {
    const context = await resolve();
    if (!context) throw new AuthError("Sessão não confirmada", 401);
    if (!isAuthorized({ identity: context.identity }, "cadastro_clinica", "read")) {
      throw new AuthError("Acesso administrativo não autorizado", 403);
    }
    const rows = clinicRowsSchema.parse(await read(context));
    return { clinics: rows.slice(0, 100), hasMore: rows.length > 100 };
  };
}

export const listPlatformClinics = createClinicDirectory(
  resolveSupabaseContext,
  async ({ client }) => {
    // Request-bound publishable client retains RLS; never use service_role for this read.
    const result = await client
      .from("tm_clinics")
      .select("id,name,is_active,created_at")
      .order("name")
      .order("id")
      .limit(101);
    if (result.error) throw new Error("Cadastro temporariamente indisponível");
    return result.data;
  },
);

export function createClinicDirectoryResponse(list: typeof listPlatformClinics) {
  return async () => {
    const headers = { "Cache-Control": "private, no-store" };
    try {
      return Response.json(await list(), { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      return Response.json(
        {
          error:
            status === 401
              ? "Sessão não confirmada"
              : status === 403
                ? "Acesso administrativo não autorizado"
                : "Cadastro temporariamente indisponível",
        },
        { status, headers },
      );
    }
  };
}
export const clinicDirectoryResponse = createClinicDirectoryResponse(listPlatformClinics);
