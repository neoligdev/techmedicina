import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import {
  contractVersionQuerySchema,
  contractVersionSchema,
} from "@/features/clinic-contracts/history-contract";
export function createContractVersionEndpoint<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  resolveSession: (request: Request) => Promise<S | null>;
  read: (
    session: S,
    args: { p_draft_id: string; p_clinic_id: string; p_revision: number },
  ) => Promise<unknown>;
}) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
    try {
      if (request.method !== "GET")
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: "GET" } },
        );
      const query = new URL(request.url).searchParams;
      if (
        request.body ||
        [...query.keys()].some(
          (k) => !["id", "clinicId", "revision"].includes(k) || query.getAll(k).length !== 1,
        ) ||
        !/^[1-9][0-9]{0,9}$/.test(query.get("revision") ?? "")
      )
        throw new AuthError("Invalid query", 400);
      const input = contractVersionQuerySchema.safeParse({
        id: query.get("id"),
        clinicId: query.get("clinicId"),
        revision: Number(query.get("revision")),
      });
      if (!input.success) throw new AuthError("Invalid query", 400);
      const session = await providers.resolveSession(request);
      if (!session) throw new AuthError("Session required", 401);
      if (session.identity.globalRole !== "super_admin") throw new AuthError("Access denied", 403);
      const raw = await providers.read(session, {
        p_draft_id: input.data.id,
        p_clinic_id: input.data.clinicId,
        p_revision: input.data.revision,
      });
      const version = raw === null ? null : contractVersionSchema.parse(raw);
      if (
        version &&
        (version.draftId !== input.data.id ||
          version.clinicId !== input.data.clinicId ||
          version.revision !== input.data.revision)
      )
        throw new Error("Unexpected snapshot");
      return Response.json({ version }, { headers });
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
                  : "Versão temporariamente indisponível",
        },
        { status, headers },
      );
    }
  };
}
