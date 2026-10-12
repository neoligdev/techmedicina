import "@tanstack/react-start/server-only";
import { z } from "zod";
import {
  domainReservationInputSchema,
  reservedDomainSchema,
  type DomainReservationInput,
} from "@/features/auth/domain-reservations";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";

export function createDomainReservationHandlers<C extends { identity: AuthenticatedIdentity }>(
  resolve: () => Promise<C | null>,
  read: (context: C, clinicId: string, after?: string) => Promise<unknown>,
  reserve: (context: C, input: DomainReservationInput) => Promise<unknown>,
) {
  const headers = { "Cache-Control": "private, no-store" };
  async function respond(request: Request, writing: boolean) {
    try {
      const context = await resolve();
      if (!context) throw new AuthError("Unauthenticated", 401);
      if (context.identity.globalRole !== "super_admin") throw new AuthError("Denied", 403);
      if (!writing) {
        const params = new URL(request.url).searchParams;
        const clinic = z.string().uuid().safeParse(params.get("clinicId"));
        const after = params.has("after")
          ? domainReservationInputSchema.shape.hostname.safeParse(params.get("after"))
          : null;
        if (
          !clinic.success ||
          (after && !after.success) ||
          [...params.keys()].some((key) => key !== "clinicId" && key !== "after") ||
          params.getAll("clinicId").length !== 1 ||
          params.getAll("after").length > 1
        )
          throw new AuthError("Invalid input", 400);
        const rows = z
          .array(reservedDomainSchema)
          .max(101)
          .parse(await read(context, clinic.data, after?.success ? after.data : undefined));
        if (rows.some((item) => item.clinic_id !== clinic.data)) throw new Error("Tenant mismatch");
        const domains = rows.slice(0, 100);
        const hasMore = rows.length > 100;
        return Response.json(
          { domains, hasMore, nextCursor: hasMore ? domains.at(-1)?.hostname : null },
          { headers },
        );
      }
      if (new URL(request.url).searchParams.size) throw new AuthError("Invalid input", 400);
      if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json")
        throw new AuthError("JSON required", 415);
      const reader = request.body?.getReader();
      if (!reader) throw new AuthError("Invalid input", 400);
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 4096) {
            await reader.cancel();
            throw new AuthError("Too large", 413);
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
        throw new AuthError("Invalid input", 400);
      }
      const input = domainReservationInputSchema.safeParse(raw);
      if (!input.success) throw new AuthError("Invalid input", 400);
      const domain = reservedDomainSchema.parse(await reserve(context, input.data));
      if (
        domain.clinic_id !== input.data.clinicId ||
        domain.hostname !== input.data.hostname ||
        domain.environment !== input.data.environment
      )
        throw new Error("Reservation mismatch");
      return Response.json({ domain }, { status: 201, headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        401: "Sessão não confirmada",
        403: "Acesso administrativo não autorizado",
        400: "Dados de domínio inválidos",
        409: "Domínio já reservado",
        413: "Dados excedem o limite",
        415: "Envie dados JSON",
      };
      return Response.json(
        { error: messages[status] ?? "Reserva temporariamente indisponível" },
        { status, headers },
      );
    }
  }
  return {
    GET: (request: Request) => respond(request, false),
    POST: (request: Request) => respond(request, true),
  };
}
