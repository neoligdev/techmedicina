import "@tanstack/react-start/server-only";
import { z } from "zod";
import { isAuthorized, type AuthContext, type PatientLinkMeta } from "@/lib/auth/core";
import { AuthError } from "@/lib/auth/guards.server";
import { readBoundedJson } from "@/lib/http/json-input.server";
import {
  evolutionScopeSchema,
  evolutionCommandSchema,
  evolutionPayloadSchema,
} from "@/features/medical-records/evolution-contract";
import { medicalHistoryCursorSchema } from "./evolution-history.server";
const resultSchema = evolutionScopeSchema
  .extend({ id: z.string().uuid(), ...evolutionPayloadSchema.shape })
  .strict();
const historySchema = z
  .object({
    items: z.array(resultSchema).max(100),
    nextCursor: medicalHistoryCursorSchema.nullable(),
  })
  .strict();
/** Factory only: no route or default resolver. Resolver must verify bearer, clinic host and patient. */
export function createMedicalEvolutionEndpoint<
  S extends { authContext: AuthContext; patientLink: PatientLinkMeta },
>(providers: {
  resolveContext: (request: Request) => Promise<S | null>;
  create: (session: S, command: z.infer<typeof evolutionCommandSchema>) => Promise<unknown>;
  read: (session: S, id: string) => Promise<unknown>;
  history: (
    session: S,
    cursor: z.infer<typeof medicalHistoryCursorSchema> | null,
  ) => Promise<unknown>;
}) {
  return async (request: Request, operation: "create" | "record" | "history") => {
    const headers = {
      "Cache-Control": "private, no-store",
      Pragma: "no-cache",
      Vary: "Authorization, Host, Origin",
      "X-Content-Type-Options": "nosniff",
    };
    let dispatched = false;
    let commandId: string | null = null;
    try {
      const method = operation === "create" ? "POST" : "GET";
      if (request.method !== method)
        return Response.json(
          { error: "Método não permitido" },
          { status: 405, headers: { ...headers, Allow: method } },
        );
      const url = new URL(request.url);
      if (operation === "create" && request.headers.get("origin") !== url.origin)
        throw new AuthError("Origin denied", 403);
      if (!/^Bearer [^\s]+$/.test(request.headers.get("authorization") ?? ""))
        throw new AuthError("Session required", 401);
      const session = await providers.resolveContext(request);
      if (!session) throw new AuthError("Access denied", 403);
      const scope = evolutionScopeSchema.parse({
        clinicId: session.authContext.currentClinicId,
        patientId: session.patientLink.patientId,
      });
      const actor = z.string().uuid().parse(session.authContext.identity.userId);
      if (
        session.authContext.identity.links.filter((v) => v.clinicId === scope.clinicId).length !== 1
      )
        throw new AuthError("Ambiguous clinic", 403);
      const metadata = {
        ownerClinicId: scope.clinicId,
        ownerPatientId: scope.patientId,
        patientLink: session.patientLink,
      };
      if (
        !isAuthorized(session.authContext, "prontuario", "read", metadata) ||
        (operation === "create" &&
          !isAuthorized(session.authContext, "prontuario", "create", metadata))
      )
        throw new AuthError("Denied", 403);
      const check = (value: unknown) => {
        const result = resultSchema.parse(value);
        if (result.clinicId !== scope.clinicId || result.patientId !== scope.patientId)
          throw new Error("Unexpected medical scope");
        return result;
      };
      if (operation === "create") {
        if (url.searchParams.size) throw new AuthError("Unexpected query", 400);
        const parsed = evolutionCommandSchema.safeParse(await readBoundedJson(request, 262144));
        if (!parsed.success) throw new AuthError("Invalid command", 400);
        const command = parsed.data;
        commandId = command.id;
        if (request.signal.aborted) throw new AuthError("Request aborted", 400);
        dispatched = true;
        const result = check(await providers.create(session, command));
        if (
          result.id !== command.id ||
          result.author.userId !== actor ||
          result.text !== command.text ||
          result.supplementsId !== command.supplementsId
        )
          throw new Error("Unexpected medical command result");
        return Response.json({ result }, { headers });
      }
      const allowed = operation === "record" ? ["id"] : ["beforeRecordedAt", "beforeId"];
      for (const [name] of url.searchParams)
        if (!allowed.includes(name) || url.searchParams.getAll(name).length !== 1)
          throw new AuthError("Invalid query", 400);
      if (operation === "record") {
        const id = z.string().uuid().safeParse(url.searchParams.get("id"));
        if (!id.success) throw new AuthError("Invalid ID", 400);
        const raw = await providers.read(session, id.data);
        if (raw === null)
          return Response.json({ error: "Registro não encontrado" }, { status: 404, headers });
        const result = check(raw);
        if (result.id !== id.data) throw new Error("Unexpected medical ID");
        return Response.json({ result }, { headers });
      }
      let cursor: z.infer<typeof medicalHistoryCursorSchema> | null = null;
      if (url.searchParams.size) {
        const parsed = medicalHistoryCursorSchema.safeParse({
          recordedAt: url.searchParams.get("beforeRecordedAt"),
          id: url.searchParams.get("beforeId"),
        });
        if (!parsed.success) throw new AuthError("Invalid cursor", 400);
        cursor = parsed.data;
      }
      const page = historySchema.parse(await providers.history(session, cursor));
      for (const item of page.items) check(item);
      return Response.json({ result: page }, { headers });
    } catch (error) {
      const status = dispatched ? 503 : error instanceof AuthError ? error.status : 503;
      return Response.json(
        {
          error: dispatched
            ? "Resultado não confirmado; consulte o ID original"
            : status === 401
              ? "Entre novamente para continuar"
              : status === 403
                ? "Acesso não autorizado"
                : status === 400
                  ? "Requisição inválida"
                  : status === 413
                    ? "Conteúdo excede o limite"
                    : status === 415
                      ? "Envie JSON"
                      : "Consulta indisponível",
          ...(dispatched ? { outcome: "uncertain", recordId: commandId } : {}),
        },
        { status, headers },
      );
    }
  };
}
