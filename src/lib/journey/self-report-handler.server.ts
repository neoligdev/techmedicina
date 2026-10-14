import "@tanstack/react-start/server-only";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { readJourneyJson } from "./json-input.server";
import { submitJourneySelfReport } from "./submit-self-report.server";

/** Local only. Resolve must use the patient host and the same verified bearer. */
export function createJourneySelfReportHandler(
  resolve: (request: Request) => Promise<{
    context: AuthContext;
    rpc: Parameters<typeof submitJourneySelfReport>[2];
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
      const receipt = await submitJourneySelfReport(
        bound.context,
        await readJourneyJson(request),
        bound.rpc,
      );
      return Response.json({ receipt }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Dados inválidos",
        401: "Entre novamente para continuar",
        403: "Acesso não autorizado",
        409: "O registro não foi confirmado. Recarregue antes de tentar novamente.",
        413: "Dados excedem o limite",
        415: "Envie dados JSON",
      };
      return Response.json(
        { error: messages[status] ?? "Registro temporariamente indisponível" },
        { status, headers },
      );
    }
  };
}
