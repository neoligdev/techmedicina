import { createFileRoute } from "@tanstack/react-router";
import { requireAuth, AuthError } from "../../lib/auth/guards.server";

export const Route = createFileRoute("/api/access-check")({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Validação de sessão no servidor
          await requireAuth();
          return Response.json({ status: "ok" });
        } catch (error) {
          if (error instanceof AuthError) {
            // Nota: Sem autenticação real (mockado como vazio), o status será sempre 401.
            // O 403 real e RLS estão pendentes de uma sessão válida de provedor de Auth.
            // O 403 está validado na camada unitária.
            return Response.json({ error: error.message }, { status: error.status });
          }
          return Response.json({ error: "Internal Server Error" }, { status: 500 });
        }
      },
    },
  },
});
