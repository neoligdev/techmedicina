import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { readBoundedJson } from "../http/json-input.server";
import {
  clinicContractWriteSchema,
  savedClinicContractSchema,
} from "@/features/clinic-contracts/contracts";
export function createClinicContractDraftEndpoint<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  resolveSession: (request: Request) => Promise<S | null>;
  rpc: (
    session: S,
    name: "tm_get_clinic_contract_draft" | "tm_save_clinic_contract_draft",
    args: Record<string, unknown>,
  ) => Promise<unknown>;
}) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
    try {
      if (!["GET", "PUT"].includes(request.method))
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: "GET, PUT" } },
        );
      const query = new URL(request.url).searchParams;
      const id = z.string().uuid().safeParse(query.get("id"));
      const clinic = z.string().uuid().safeParse(query.get("clinicId"));
      if (
        !id.success ||
        !clinic.success ||
        query.size !== 2 ||
        query.getAll("id").length !== 1 ||
        query.getAll("clinicId").length !== 1 ||
        (request.method === "GET" && request.body)
      )
        throw new AuthError("Invalid query", 400);
      const session = await providers.resolveSession(request);
      if (!session) throw new AuthError("Session required", 401);
      if (session.identity.globalRole !== "super_admin") throw new AuthError("Access denied", 403);
      let raw: unknown;
      let expected: number | undefined;
      let document: unknown;
      if (request.method === "PUT") {
        const parsed = clinicContractWriteSchema.safeParse(await readBoundedJson(request, 65536));
        if (!parsed.success || parsed.data.id !== id.data || parsed.data.clinicId !== clinic.data)
          throw new AuthError("Invalid draft", 400);
        expected = parsed.data.expectedRevision;
        document = parsed.data.document;
        raw = await providers.rpc(session, "tm_save_clinic_contract_draft", {
          p_draft_id: id.data,
          p_clinic_id: clinic.data,
          p_expected_revision: expected,
          p_document: document,
        });
      } else
        raw = await providers.rpc(session, "tm_get_clinic_contract_draft", {
          p_draft_id: id.data,
          p_clinic_id: clinic.data,
        });
      const draft = raw === null ? null : savedClinicContractSchema.parse(raw);
      if (
        draft &&
        (draft.id !== id.data ||
          draft.clinicId !== clinic.data ||
          (expected !== undefined &&
            (![expected, expected + 1].includes(draft.revision) ||
              JSON.stringify(draft.document) !== JSON.stringify(document))))
      )
        throw new Error("Unexpected draft");
      if (request.method === "PUT" && !draft) throw new Error("Unconfirmed write");
      return Response.json({ draft }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Dados inválidos",
        401: "Entre novamente para continuar",
        403: "Acesso não autorizado",
        409: "O rascunho mudou. Recarregue antes de salvar.",
        413: "Conteúdo excede o limite",
        415: "Envie dados JSON",
      };
      return Response.json(
        { error: messages[status] ?? "Contratos temporariamente indisponíveis" },
        { status, headers },
      );
    }
  };
}
