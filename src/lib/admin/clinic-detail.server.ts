import "@tanstack/react-start/server-only";
import { z } from "zod";
import { savedClinicSchema } from "../../features/auth/clinic-write";
import { isAuthorized } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { resolveSupabaseContext } from "../auth/supabase-adapter.server";

export async function clinicDetailResponse(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const context = await resolveSupabaseContext();
    if (!context) throw new AuthError("Sessão não confirmada", 401);
    if (!isAuthorized({ identity: context.identity }, "cadastro_clinica", "read"))
      throw new AuthError("Acesso administrativo não autorizado", 403);
    const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));
    if (!id.success) throw new AuthError("Identificador inválido", 400);
    const result = await context.client
      .from("tm_clinics")
      .select("id,name,is_active,created_at,revision")
      .eq("id", id.data)
      .maybeSingle();
    if (result.error) throw new Error("Unavailable");
    if (!result.data) throw new AuthError("Clínica não encontrada", 404);
    const clinic = savedClinicSchema.parse(result.data);
    if (clinic.id !== id.data) throw new Error("Unexpected result");
    return Response.json({ clinic }, { headers });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof AuthError ? error.message : "Cadastro temporariamente indisponível",
      },
      { status: error instanceof AuthError ? error.status : 503, headers },
    );
  }
}
