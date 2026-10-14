import "@tanstack/react-start/server-only";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { readJourneyJson } from "./json-input.server";
import { pauseJourneyGoal } from "./goal-pause.server";

/** Local injectable boundary. No public route/runtime activated. Resolve validates host and Auth. */
export function createJourneyGoalPauseHandler(
  resolve: (request: Request) => Promise<{
    context: AuthContext;
    repository: Parameters<typeof pauseJourneyGoal>[2];
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
      const resolved = await resolve(request);
      if (!resolved) throw new AuthError("Session required", 401);
      const goal = await pauseJourneyGoal(
        resolved.context,
        await readJourneyJson(request),
        resolved.repository,
      );
      return Response.json({ goal }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Dados inválidos",
        401: "Entre novamente para continuar",
        403: "Acesso não autorizado",
        409: "A meta mudou. Recarregue antes de suspender.",
        413: "Dados excedem o limite",
        415: "Envie dados JSON",
      };
      return Response.json(
        { error: messages[status] ?? "Suspensão temporariamente indisponível" },
        { status, headers },
      );
    }
  };
}
