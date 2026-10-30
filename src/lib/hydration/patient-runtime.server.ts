import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { AuthError } from "@/lib/auth/guards.server";
import { createOwnHydrationContextResolver } from "./own-context.server";
import { createOwnHydrationListEndpoint } from "./list-endpoint.server";
import { createOwnHydrationReceiptEndpoint } from "./receipt-endpoint.server";
import { createOwnHydrationMutationEndpoint } from "./mutation-endpoint.server";
export type HydrationReadOperation = "context" | "records" | "receipt" | "mutate";
type HydrationRpc =
  | "tm_resolve_patient_hydration_host"
  | "tm_list_own_hydration_records"
  | "tm_get_own_hydration_receipt"
  | "tm_mutate_own_hydration_record";
/** Every invocation owns its Auth promise; lookup and data RPC use the same request bearer. */
export function createPatientHydrationRuntime<
  S extends { identity: AuthenticatedIdentity },
>(providers: {
  resolveSession: (request: Request) => Promise<S | null>;
  rpc: (session: S, name: HydrationRpc, args: Record<string, unknown>) => Promise<unknown>;
}) {
  return async (operation: HydrationReadOperation, request: Request) => {
    let sessionPromise: Promise<S | null> | undefined;
    const resolveSession = () => (sessionPromise ??= providers.resolveSession(request));
    const resolveContext = createOwnHydrationContextResolver({
      resolveSession,
      lookup: async (hostname) => {
        const session = await resolveSession();
        if (!session) throw new AuthError("Session required", 401);
        return providers.rpc(session, "tm_resolve_patient_hydration_host", {
          p_hostname: hostname,
        });
      },
    });
    if (operation === "mutate")
      return createOwnHydrationMutationEndpoint({
        resolveContext,
        mutate: (bound, args) =>
          providers.rpc(bound.session, "tm_mutate_own_hydration_record", args),
      })(request);
    if (operation === "receipt")
      return createOwnHydrationReceiptEndpoint({
        resolveContext,
        read: (bound, args) => providers.rpc(bound.session, "tm_get_own_hydration_receipt", args),
      })(request);
    if (operation === "records")
      return createOwnHydrationListEndpoint({
        resolveContext,
        read: (bound, args) => providers.rpc(bound.session, "tm_list_own_hydration_records", args),
      })(request);
    const headers = { "Cache-Control": "private, no-store", Vary: "Authorization, Host" };
    try {
      if (request.method !== "GET")
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: "GET" } },
        );
      if (new URL(request.url).searchParams.size || request.body)
        throw new AuthError("Unexpected input", 400);
      const context = await resolveContext(request);
      if (!context) throw new AuthError("Session required", 401);
      return Response.json(
        { scope: { clinicId: context.authContext.currentClinicId, patientId: context.patientId } },
        { headers },
      );
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
                  : "Contexto temporariamente indisponível",
        },
        { status, headers },
      );
    }
  };
}
