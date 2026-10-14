import "@tanstack/react-start/server-only";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { readJourneyGoalForDoctor } from "./goal-read.server";
/** Local boundary only; resolver validates host/session before repository reads. */
export function createJourneyGoalReadHandler(
  resolve: (request: Request) => Promise<{
    context: AuthContext;
    read: Parameters<typeof readJourneyGoalForDoctor>[2];
  } | null>,
) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store" };
    try {
      if (request.method !== "GET")
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: "GET" } },
        );
      const resolved = await resolve(request);
      if (!resolved) throw new AuthError("Session required", 401);
      const params = new URL(request.url).searchParams;
      if (params.size !== 1 || params.getAll("goalId").length !== 1)
        throw new AuthError("Invalid query", 400);
      const goal = await readJourneyGoalForDoctor(
        resolved.context,
        params.get("goalId"),
        resolved.read,
      );
      return Response.json({ goal }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Meta inválida",
        401: "Entre novamente para continuar",
        403: "Acesso não autorizado",
      };
      return Response.json(
        { error: messages[status] ?? "Meta temporariamente indisponível" },
        { status, headers },
      );
    }
  };
}
