import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthContext, PatientLinkMeta } from "@/lib/auth/core";
import { isAuthorized } from "@/lib/auth/core";
import { AuthError } from "@/lib/auth/guards.server";
import {
  hydrationRecoverySchema,
  validateHydrationRecovery,
} from "@/features/hydration/recovery-contract";
const querySchema = z
  .object({ recordId: z.string().uuid(), sourceRequestId: z.string().uuid() })
  .strict();
export function createOwnHydrationReceiptEndpoint<
  S extends { authContext: AuthContext; patientId: string; patientLink: PatientLinkMeta },
>(providers: {
  resolveContext: (request: Request) => Promise<S | null>;
  read: (
    session: S,
    args: { p_clinic_id: string; p_record_id: string; p_source_request_id: string },
  ) => Promise<unknown>;
}) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store", Vary: "Authorization, Host" };
    try {
      if (request.method !== "GET")
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: "GET" } },
        );
      const q = new URL(request.url).searchParams;
      if (
        request.body ||
        [...q.keys()].some(
          (k) => !["recordId", "sourceRequestId"].includes(k) || q.getAll(k).length !== 1,
        )
      )
        throw new AuthError("Invalid query", 400);
      const parsed = querySchema.safeParse(Object.fromEntries(q));
      if (!parsed.success) throw new AuthError("Invalid query", 400);
      const session = await providers.resolveContext(request);
      if (!session) throw new AuthError("Session required", 401);
      const clinicId = session.authContext.currentClinicId;
      if (
        !clinicId ||
        !isAuthorized(session.authContext, "hydration_records", "read", {
          ownerClinicId: clinicId,
          ownerPatientId: session.patientId,
          patientLink: session.patientLink,
        })
      )
        throw new AuthError("Access denied", 403);
      const input = parsed.data,
        scope = { clinicId, patientId: session.patientId };
      const result = hydrationRecoverySchema.parse(
        await providers.read(session, {
          p_clinic_id: clinicId,
          p_record_id: input.recordId,
          p_source_request_id: input.sourceRequestId,
        }),
      );
      const equal = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      if (
        !equal(result.clinicId, scope.clinicId) ||
        !equal(result.patientId, scope.patientId) ||
        (result.record &&
          (!equal(result.record.id, input.recordId) ||
            !equal(result.record.clinicId, clinicId) ||
            !equal(result.record.patientId, session.patientId)))
      )
        throw new Error("Unexpected scope");
      if (result.receipt) {
        if (
          !equal(result.receipt.command.recordId, input.recordId) ||
          !equal(result.receipt.command.sourceRequestId, input.sourceRequestId)
        )
          throw new Error("Unexpected receipt");
        validateHydrationRecovery(result, scope, result.receipt.command);
      }
      return Response.json({ result }, { headers });
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
                  : "Confirmação temporariamente indisponível",
        },
        { status, headers },
      );
    }
  };
}
