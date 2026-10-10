import "@tanstack/react-start/server-only";
import {
  clinicWriteSchema,
  savedClinicSchema,
  type ClinicWrite,
} from "../../features/auth/clinic-write";
import { isAuthorized, type AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { resolveSupabaseContext } from "../auth/supabase-adapter.server";

export function createClinicWriter<Context extends { identity: AuthenticatedIdentity }>(
  resolve: () => Promise<Context | null>,
  write: (context: Context, input: ClinicWrite) => Promise<unknown>,
) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store" };
    try {
      const context = await resolve();
      if (!context) throw new AuthError("Sessão não confirmada", 401);
      if (!isAuthorized({ identity: context.identity }, "cadastro_clinica", "manage"))
        throw new AuthError("Acesso administrativo não autorizado", 403);
      if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json")
        throw new AuthError("Envie dados JSON", 415);
      // Bound the stream before decoding/parsing; a forged/missing Content-Length cannot bypass it.
      const reader = request.body?.getReader();
      if (!reader) throw new AuthError("Dados inválidos", 400);
      let size = 0;
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 4096) {
            await reader.cancel();
            throw new AuthError("Dados excedem o limite", 413);
          }
          chunks.push(chunk.value);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      let raw: unknown;
      try {
        raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      } catch {
        throw new AuthError("Dados inválidos", 400);
      }
      const parsed = clinicWriteSchema.safeParse(raw);
      if (!parsed.success) throw new AuthError("Dados inválidos", 400);
      const saved = savedClinicSchema.parse(await write(context, parsed.data));
      return Response.json(
        { clinic: saved },
        { status: parsed.data.operation === "create" ? 201 : 200, headers },
      );
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      return Response.json(
        {
          error:
            error instanceof AuthError ? error.message : "Cadastro temporariamente indisponível",
        },
        { status, headers },
      );
    }
  };
}

export const writePlatformClinic = createClinicWriter(
  resolveSupabaseContext,
  async ({ client }, input) => {
    const result = await client.rpc("tm_save_clinic", {
      p_name: input.name,
      p_is_active: input.isActive,
      ...(input.operation === "update"
        ? { p_clinic_id: input.id, p_expected_revision: input.expectedRevision }
        : {}),
    });
    if (result.error) {
      if (result.error.code === "40001")
        throw new AuthError("A clínica mudou. Recarregue antes de editar.", 409);
      if (result.error.code === "42501")
        throw new AuthError("Acesso administrativo não autorizado", 403);
      if (result.error.code === "22023") throw new AuthError("Dados inválidos", 400);
      throw new Error("Cadastro temporariamente indisponível");
    }
    return result.data;
  },
);
