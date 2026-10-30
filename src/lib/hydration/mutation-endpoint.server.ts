import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthContext, PatientLinkMeta } from "@/lib/auth/core";
import { isAuthorized } from "@/lib/auth/core";
import { AuthError } from "@/lib/auth/guards.server";
import { readBoundedJson } from "@/lib/http/json-input.server";
import {
  hydrationCommandSchema,
  hydrationReceiptSchema,
} from "@/features/hydration/mutation-contract";
import { hydrationRecordSchema } from "@/features/hydration/contracts";
import { validateHydrationRecovery } from "@/features/hydration/recovery-contract";
export function createOwnHydrationMutationEndpoint<
  S extends { authContext: AuthContext; patientId: string; patientLink: PatientLinkMeta },
>(providers: {
  resolveContext: (request: Request) => Promise<S | null>;
  mutate: (session: S, args: { p_clinic_id: string; p_command: unknown }) => Promise<unknown>;
}) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store", Vary: "Authorization, Host" };
    try {
      if (request.method !== "POST")
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: "POST" } },
        );
      if (new URL(request.url).searchParams.size) throw new AuthError("Unexpected query", 400);
      const parsed = hydrationCommandSchema.safeParse(await readBoundedJson(request, 4096));
      if (!parsed.success) throw new AuthError("Invalid input", 400);
      const session = await providers.resolveContext(request);
      if (!session) throw new AuthError("Session required", 401);
      const clinicId = session.authContext.currentClinicId,
        command = parsed.data;
      const owner = {
        ...(clinicId ? { ownerClinicId: clinicId } : {}),
        ownerPatientId: session.patientId,
        patientLink: session.patientLink,
      };
      if (
        !clinicId ||
        !isAuthorized(session.authContext, "hydration_records", "read", owner) ||
        !isAuthorized(
          session.authContext,
          "hydration_records",
          command.kind === "create" ? "create" : "write",
          owner,
        )
      )
        throw new AuthError("Denied", 403);
      const result = z
        .object({
          receipt: hydrationReceiptSchema,
          record: hydrationRecordSchema,
          replayed: z.boolean(),
        })
        .strict()
        .parse(await providers.mutate(session, { p_clinic_id: clinicId, p_command: command }));
      validateHydrationRecovery(
        { clinicId, patientId: session.patientId, receipt: result.receipt, record: result.record },
        { clinicId, patientId: session.patientId },
        command,
      );
      return Response.json({ result }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      return Response.json(
        {
          error:
            status === 409
              ? "Registro alterado; consulte o recibo e a revisão atual"
              : status === 401
                ? "Entre novamente para continuar"
                : status === 403
                  ? "Acesso não autorizado"
                  : status === 413
                    ? "Conteúdo excede o limite"
                    : status === 415
                      ? "Envie JSON"
                      : status === 400
                        ? "Registro inválido"
                        : "Resultado não confirmado; consulte o recibo original",
        },
        { status, headers },
      );
    }
  };
}
