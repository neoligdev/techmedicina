import "@tanstack/react-start/server-only";
import { z } from "zod";
import {
  clinicBrandingWriteSchema,
  savedClinicBrandingSchema,
} from "../../features/auth/clinic-branding";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";

type BrandingWrite = z.infer<typeof clinicBrandingWriteSchema>;
type Context = { identity: AuthenticatedIdentity };
const clinicIdSchema = z.string().uuid();
const headers = { "Cache-Control": "private, no-store" };

function canAccess(identity: AuthenticatedIdentity, clinicId: string, write: boolean) {
  if (identity.globalRole === "super_admin") return true;
  const link = identity.links.find((item) => item.clinicId === clinicId && item.isActive);
  if (!link || !["admin", "medico", "paciente"].includes(link.role)) return false;
  if (!write) return link.role !== "paciente" || !!link.patientId;
  return (
    link.role === "admin" &&
    link.grants.some((grant) => grant.resource === "cadastro_clinica" && grant.action === "write")
  );
}

async function readInput(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json")
    throw new AuthError("Envie dados JSON", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("Dados inválidos", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      // Two 200KB images plus bounded metadata; independent of Content-Length.
      if (size > 560000) {
        await reader.cancel();
        throw new AuthError("Dados excedem o limite", 413);
      }
      chunks.push(part.value);
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
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new AuthError("Dados inválidos", 400);
  }
}

export function createClinicBrandingHandlers<C extends Context>(
  resolve: () => Promise<C | null>,
  read: (context: C, clinicId: string) => Promise<unknown>,
  write: (context: C, input: BrandingWrite) => Promise<unknown>,
) {
  async function respond(request: Request, writing: boolean) {
    try {
      const context = await resolve();
      if (!context) throw new AuthError("Sessão não confirmada", 401);
      const params = new URL(request.url).searchParams;
      const parsedId = clinicIdSchema.safeParse(params.get("clinicId"));
      if (!parsedId.success || params.size !== 1 || params.getAll("clinicId").length !== 1)
        throw new AuthError("Clínica inválida", 400);
      if (!canAccess(context.identity, parsedId.data, writing))
        throw new AuthError("Acesso não autorizado", 403);
      if (!writing) {
        const raw = await read(context, parsedId.data);
        const branding = raw === null ? null : savedClinicBrandingSchema.parse(raw);
        if (branding && branding.clinic_id !== parsedId.data) throw new Error("Tenant mismatch");
        return Response.json({ branding }, { headers });
      }
      const input = clinicBrandingWriteSchema.safeParse(await readInput(request));
      if (!input.success || input.data.clinicId !== parsedId.data)
        throw new AuthError("Dados inválidos", 400);
      const saved = savedClinicBrandingSchema.parse(await write(context, input.data));
      if (saved.clinic_id !== parsedId.data) throw new Error("Tenant mismatch");
      return Response.json({ branding: saved }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Dados inválidos",
        401: "Sessão não confirmada",
        403: "Acesso não autorizado",
        409: "A personalização mudou. Recarregue antes de salvar.",
        413: "Dados excedem o limite",
        415: "Envie dados JSON",
      };
      return Response.json(
        { error: messages[status] ?? "Personalização temporariamente indisponível" },
        { status, headers },
      );
    }
  }
  return {
    GET: (request: Request) => respond(request, false),
    PUT: (request: Request) => respond(request, true),
  };
}
