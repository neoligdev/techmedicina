import "@tanstack/react-start/server-only";
import { z } from "zod";
import { domainAuditRowsSchema } from "@/features/auth/domain-audit";
import { auditCursorSchema, type AuditCursor } from "@/features/auth/administrative-audit";
import { reservedDomainSchema } from "@/features/auth/domain-reservations";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
export function createDomainAudit<C extends { identity: AuthenticatedIdentity }>(
  resolve: () => Promise<C | null>,
  readDomain: (context: C, clinicId: string, domainId: string) => Promise<unknown>,
  readEvents: (context: C, domainId: string, cursor?: AuditCursor) => Promise<unknown>,
) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store" };
    try {
      const context = await resolve();
      if (!context) throw new AuthError("Session required", 401);
      if (context.identity.globalRole !== "super_admin") throw new AuthError("Denied", 403);
      const params = new URL(request.url).searchParams;
      if (
        [...params.keys()].some(
          (key) => !["clinicId", "domainId", "before", "beforeId"].includes(key),
        ) ||
        [...params.keys()].some((key) => params.getAll(key).length !== 1)
      )
        throw new AuthError("Invalid input", 400);
      const clinic = z.string().uuid().safeParse(params.get("clinicId"));
      const domainId = z.string().uuid().safeParse(params.get("domainId"));
      if (!clinic.success || !domainId.success) throw new AuthError("Invalid input", 400);
      let cursor: AuditCursor | undefined;
      if (params.has("before") || params.has("beforeId")) {
        const parsed = auditCursorSchema.safeParse({
          before: params.get("before"),
          beforeId: params.get("beforeId"),
        });
        if (!parsed.success) throw new AuthError("Invalid cursor", 400);
        cursor = parsed.data;
      }
      const domains = z
        .array(reservedDomainSchema)
        .max(1)
        .parse(await readDomain(context, clinic.data, domainId.data));
      const domain = domains[0];
      if (!domain) throw new AuthError("Not found", 404);
      if (domain.id !== domainId.data || domain.clinic_id !== clinic.data)
        throw new Error("Domain mismatch");
      const rows = domainAuditRowsSchema.parse(await readEvents(context, domainId.data, cursor));
      if (rows.some((event) => event.domain_id !== domainId.data))
        throw new Error("Audit mismatch");
      const events = rows.slice(0, 100),
        last = events.at(-1),
        hasMore = rows.length > 100;
      return Response.json(
        {
          domain,
          events,
          hasMore,
          nextCursor: hasMore && last ? { before: last.occurred_at, beforeId: last.id } : null,
        },
        { headers },
      );
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      return Response.json(
        {
          error:
            status === 401 || status === 403
              ? "Consulta não autorizada"
              : status === 400
                ? "Consulta inválida"
                : status === 404
                  ? "Reserva não encontrada"
                  : "Auditoria temporariamente indisponível",
        },
        { status, headers },
      );
    }
  };
}
