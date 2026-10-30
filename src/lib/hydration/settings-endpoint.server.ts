import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthContext, PatientLinkMeta } from "@/lib/auth/core";
import { isAuthorized } from "@/lib/auth/core";
import { AuthError } from "@/lib/auth/guards.server";
import { readBoundedJson } from "@/lib/http/json-input.server";
import {
  hydrationSettingsCommandSchema,
  validateHydrationSettings,
} from "@/features/hydration/settings-contract";
export function createHydrationSettingsEndpoint<
  S extends { authContext: AuthContext; patientId: string; patientLink: PatientLinkMeta },
>(providers: {
  resolveContext: (r: Request) => Promise<S | null>;
  read: (s: S, args: Record<string, unknown>) => Promise<unknown>;
  save: (s: S, args: Record<string, unknown>) => Promise<unknown>;
}) {
  return async (request: Request) => {
    const headers = { "Cache-Control": "private, no-store", Vary: "Authorization, Host" };
    try {
      if (!["GET", "POST"].includes(request.method))
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: "GET, POST" } },
        );
      const write = request.method === "POST",
        params = new URL(request.url).searchParams;
      if (
        [...params.keys()].some(
          (k) => write || k !== "sourceRequestId" || params.getAll(k).length !== 1,
        ) ||
        (!write && request.body)
      )
        throw new AuthError("Invalid query", 400);
      const requestId = params.get("sourceRequestId");
      if (requestId !== null && !z.string().uuid().safeParse(requestId).success)
        throw new AuthError("Invalid identifier", 400);
      const parsed = write
        ? hydrationSettingsCommandSchema.safeParse(await readBoundedJson(request, 4096))
        : null;
      if (parsed && !parsed.success) throw new AuthError("Invalid settings", 400);
      const command = parsed?.success ? parsed.data : undefined;
      const session = await providers.resolveContext(request);
      if (!session) throw new AuthError("Session required", 401);
      const clinicId = session.authContext.currentClinicId;
      if (!clinicId) throw new AuthError("Denied", 403);
      const owner = {
        ownerClinicId: clinicId,
        ownerPatientId: session.patientId,
        patientLink: session.patientLink,
      };
      if (
        !isAuthorized(session.authContext, "hydration_records", "read", owner) ||
        (write && !isAuthorized(session.authContext, "hydration_records", "write", owner))
      )
        throw new AuthError("Denied", 403);
      const raw = write
        ? await providers.save(session, { p_clinic_id: clinicId, p_command: command })
        : await providers.read(session, {
            p_clinic_id: clinicId,
            ...(requestId ? { p_source_request_id: requestId } : {}),
          });
      const result = validateHydrationSettings(
        raw,
        { clinicId, patientId: session.patientId },
        command,
      );
      if (
        (write && !result.receipt) ||
        (requestId &&
          result.receipt?.command.sourceRequestId.toLowerCase() !== requestId.toLowerCase() &&
          result.receipt !== null)
      )
        throw new Error("Unexpected confirmation");
      return Response.json({ result }, { headers });
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 503;
      return Response.json(
        {
          error:
            status === 409
              ? "Preferências alteradas; consulte a revisão atual"
              : status === 401
                ? "Entre novamente para continuar"
                : status === 403
                  ? "Acesso não autorizado"
                  : status === 400 || status === 413 || status === 415
                    ? "Preferências inválidas ou conteúdo excessivo"
                    : "Preferências temporariamente indisponíveis; confirme o recibo se enviou uma alteração",
        },
        { status, headers },
      );
    }
  };
}
