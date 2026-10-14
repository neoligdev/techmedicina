import "@tanstack/react-start/server-only";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { readJourneyJson } from "./json-input.server";
import { createJourneyGoalDraft } from "./goal-draft.server";
/** Unmounted local POST; resolver must validate medical host and same request Auth. */
export function createJourneyGoalDraftHandler(
  resolve: (request: Request) => Promise<{
    context: AuthContext;
    rpc: Parameters<typeof createJourneyGoalDraft>[2];
  } | null>,
) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store" };
    try {
      if (request.method !== "POST")
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: "POST" } },
        );
      if (new URL(request.url).searchParams.size) throw new AuthError("Unexpected query", 400);
      const bound = await resolve(request);
      if (!bound) throw new AuthError("Session required", 401);
      const draft = await createJourneyGoalDraft(
        bound.context,
        await readJourneyJson(request),
        bound.rpc,
      );
      return Response.json({ draft }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Dados inválidos",
        401: "Entre novamente para continuar",
        403: "Acesso não autorizado",
        409: "A solicitação mudou. Verifique o rascunho antes de reenviar.",
        413: "Dados excedem o limite",
        415: "Envie dados JSON",
      };
      return Response.json(
        { error: messages[status] ?? "Rascunho temporariamente indisponível" },
        { status, headers },
      );
    }
  };
}
