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
            // Nota: A sessão agora é validada no Auth server via getUser(token), não sendo mais sempre 401.
            // 403 real e RLS estão pendentes de provisionamento na base, mas 401 ocorre genuinamente sem sessão.
            // O 403 está validado na camada unitária.
            return Response.json({ error: error.message }, { status: error.status });
          }
          return Response.json({ error: "Internal Server Error" }, { status: 500 });
        }
      },
    },
  },
});
