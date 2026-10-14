import "@tanstack/react-start/server-only";
import type { AuthContext } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { readJourneyPreference, saveJourneyPreference } from "./preferences.server";
import { readJourneyJson } from "./json-input.server";

export type JourneyPreferenceRpc = (
  name: "tm_get_journey_preference" | "tm_set_journey_preference",
  args: { p_patient_id: string; p_is_enabled?: boolean; p_expected_revision?: number },
) => Promise<unknown>;

/** No public route enabled yet. Resolve must validate Auth and the patient host registry.
 * The injected transport must use the same bearer session and retain RPC/RLS enforcement.
 */
export function createJourneyPreferenceHandlers(
  resolve: (request: Request) => Promise<{
    context: AuthContext;
    rpc: JourneyPreferenceRpc;
  } | null>,
) {
  const headers = { "Cache-Control": "private, no-store" };
  async function respond(request: Request, writing: boolean) {
    try {
      const method = writing ? "PUT" : "GET";
      if (request.method !== method)
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: method } },
        );
      if (new URL(request.url).searchParams.size !== 0)
        throw new AuthError("Unexpected query", 400);
      const resolved = await resolve(request);
      if (!resolved) throw new AuthError("Session required", 401);
      const { context, rpc } = resolved;
      const ownLinks = context.identity.links.filter(
        (link) =>
          link.clinicId === context.currentClinicId &&
          link.isActive &&
          link.role === "paciente" &&
          link.patientId,
      );
      if (!context.currentClinicId || ownLinks.length !== 1)
        throw new AuthError("Participation denied", 403);
      const preference = writing
        ? await saveJourneyPreference(context, await readJourneyJson(request), rpc)
        : await readJourneyPreference(context, ownLinks[0]!.patientId!, rpc);
      return Response.json({ preference }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      const messages: Record<number, string> = {
        400: "Dados inválidos",
        401: "Entre novamente para continuar",
        403: "Acesso não autorizado",
        409: "Sua participação mudou. Recarregue antes de salvar.",
        413: "Dados excedem o limite",
        415: "Envie dados JSON",
      };
      return Response.json(
        { error: messages[status] ?? "Participação temporariamente indisponível" },
        { status, headers },
      );
    }
  }
  return {
    GET: (request: Request) => respond(request, false),
    PUT: (request: Request) => respond(request, true),
  };
}
