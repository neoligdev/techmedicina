import { hydrationScopeSchema } from "@/features/hydration/contracts";
import "@tanstack/react-start/server-only";
import type { AuthContext, PatientLinkMeta } from "@/lib/auth/core";
import { isAuthorized } from "@/lib/auth/core";
import { AuthError } from "@/lib/auth/guards.server";
import {
  hydrationListQuerySchema,
  validateHydrationPage,
} from "@/features/hydration/list-contract";
/** No default runtime: resolver must verify Auth, live patient link and the request host. */
export function createOwnHydrationListEndpoint<
  S extends { authContext: AuthContext; patientId: string; patientLink: PatientLinkMeta },
>(providers: {
  resolveContext: (request: Request) => Promise<S | null>;
  read: (
    session: S,
    args: {
      p_clinic_id: string;
      p_from: string;
      p_until: string;
      p_after?: string;
      p_limit: number;
    },
  ) => Promise<unknown>;
}) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store", Vary: "Authorization, Host" };
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
          (k) => !["from", "until", "after", "limit"].includes(k) || q.getAll(k).length !== 1,
        ) ||
        (q.has("limit") && !/^[1-9][0-9]{0,2}$/.test(q.get("limit")!))
      )
        throw new AuthError("Invalid query", 400);
      const input = hydrationListQuerySchema.safeParse({
        from: q.get("from"),
        until: q.get("until"),
        ...(q.has("after") ? { after: q.get("after") } : {}),
        ...(q.has("limit") ? { limit: Number(q.get("limit")) } : {}),
      });
      if (!input.success) throw new AuthError("Invalid query", 400);
      const session = await providers.resolveContext(request);
      if (!session) throw new AuthError("Session required", 401);
      const clinicId = session.authContext.currentClinicId;
      if (
        !clinicId ||
        !isAuthorized(session.authContext, "hydration_records", "read", {
          ownerClinicId: clinicId,
          ownerPatientId: session.patientId,
          patientLink: session.patientLink,
        })
      )
        throw new AuthError("Access denied", 403);
      const p = input.data,
        scope = hydrationScopeSchema.parse({ clinicId, patientId: session.patientId });
      const page = validateHydrationPage(
        await providers.read(session, {
          p_clinic_id: clinicId,
          p_from: p.from,
          p_until: p.until,
          ...(p.after ? { p_after: p.after } : {}),
          p_limit: p.limit,
        }),
        scope,
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
