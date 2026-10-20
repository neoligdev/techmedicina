import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { resolveSupabaseContext } from "../auth/supabase-adapter.server";
import { createAvailabilityEndpoint } from "./availability-endpoint.server";
import { createAvailabilityReadEndpoint } from "./availability-read-endpoint.server";
import type { AvailabilityRpc } from "./availability-write.server";
import type { AvailabilityReader } from "./availability-read.server";
import { createAvailabilitySqlReader } from "./availability-sql-reader.server";
import { createReliableClinicResolver } from "../clinic/clinic-host-context.server";

export interface AvailabilityRuntimeProviders<S extends { identity: AuthenticatedIdentity }> {
  lookup: (hostname: string) => Promise<unknown>;
  lookupClinic?: (clinicId: string) => Promise<unknown>;
  resolveSession: (request: Request) => Promise<S | null>;
  rpc: (session: S) => AvailabilityRpc;
  reader: (session: S) => AvailabilityReader;
}

/**
 * Avalia se a infraestrutura operacional da agenda médica está homologada e ativada no ambiente.
 * Permanece desabilitada por padrão seguro enquanto a migração 015 não for homologada no Cloud.
 */
export function isAgendaOperationalReady(): boolean {
  return process.env["AGENDA_OPERATIONAL_ENABLED"] === "true";
}

/**
 * Cria os manipuladores HTTP para a rota /api/agenda/availability e /api/agenda/clinic.
 * Reutiliza os endpoints comprovados de escrita (D95) e leitura (D106),
 * garantindo autenticação obrigatória, autorização por perfil médico,
 * isolamento por domínio clínico, validação de payload, cabeçalhos privados,
 * validação estrita do fuso horário IANA oficial da clínica e barreira de segurança
 * preventiva enquanto a infraestrutura remota aguarda homologação no Cloud.
 */
export function createAgendaAvailabilityHandlers<S extends { identity: AuthenticatedIdentity }>(
  customProviders?: AvailabilityRuntimeProviders<S>,
) {
  const defaultProviders: AvailabilityRuntimeProviders<{ identity: AuthenticatedIdentity }> = {
    lookup: async (hostname: string) => {
      const supabaseContext = await resolveSupabaseContext();
      if (!supabaseContext) return null;
      try {
        const { data, error } = await (
          supabaseContext.client as unknown as {
            from: (t: string) => {
              select: (s: string) => {
                eq: (
                  col: string,
                  val: string,
                ) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
              };
            };
          }
        )
          .from("tm_domain_reservations")
          .select("hostname,clinic_id,environment,status")
          .eq("hostname", hostname)
          .maybeSingle();
        if (error || !data) return null;
        const row = data as unknown as {
          hostname: string;
          clinic_id: string;
          environment: string;
          status: string;
        };
        return {
          hostname: row.hostname,
          clinicId: row.clinic_id,
          environment: row.environment,
          status: row.status,
        };
      } catch {
        return null;
      }
    },
    lookupClinic: async (clinicId: string) => {
      const supabaseContext = await resolveSupabaseContext();
      if (!supabaseContext) return null;
      try {
        const { data, error } = await (
          supabaseContext.client as unknown as {
            from: (t: string) => {
              select: (s: string) => {
                eq: (
                  col: string,
                  val: string,
                ) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
              };
            };
          }
        )
          .from("tm_clinics")
          .select("id,name,is_active,time_zone")
          .eq("id", clinicId)
          .maybeSingle();
        if (error || !data) return null;
        return data;
      } catch {
        return null;
      }
    },
    resolveSession: async () => {
      const supabaseContext = await resolveSupabaseContext();
      if (!supabaseContext) return null;
      return { identity: supabaseContext.identity };
    },
    rpc: () => {
      return async (args) => {
        if (!isAgendaOperationalReady()) {
          return { data: null, error: { code: "503" } };
        }
        const supabaseContext = await resolveSupabaseContext();
        if (!supabaseContext) {
          return { data: null, error: { code: "503" } };
        }
        try {
          const { data, error } = await (
            supabaseContext.client.rpc as unknown as (
              fn: string,
              params: unknown,
            ) => Promise<{ data: unknown; error: { code?: string } | null }>
          )("tm_create_own_availability", args);
          return { data, error };
        } catch {
          return { data: null, error: { code: "503" } };
        }
      };
    },
    reader: (session) => {
      return createAvailabilitySqlReader(session.identity.userId, async () => {
        if (!isAgendaOperationalReady()) {
          throw new AuthError("Disponibilidade temporariamente indisponível", 503);
        }
        throw new AuthError("Disponibilidade temporariamente indisponível", 503);
      });
    },
  };

  const providers = (customProviders ??
    defaultProviders) as unknown as AvailabilityRuntimeProviders<S>;

  const postEndpoint = createAvailabilityEndpoint(providers);
  const getEndpoint = createAvailabilityReadEndpoint(providers);

  const reliableClinicResolver = createReliableClinicResolver("clinic_portal", {
    lookupDomain: providers.lookup,
    lookupClinic:
      providers.lookupClinic ??
      (async (clinicId: string) => {
        const supabaseContext = await resolveSupabaseContext();
        if (!supabaseContext) return null;
        const { data } = await (
          supabaseContext.client.from("tm_clinics") as unknown as {
            select: (s: string) => {
              eq: (
                col: string,
                val: string,
              ) => {
                maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
              };
            };
          }
        )
          .select("id,name,is_active,time_zone")
          .eq("id", clinicId)
          .maybeSingle();
        return data;
      }),
    resolveSession: providers.resolveSession,
  });

  return {
    POST: async (request: Request): Promise<Response> => {
      // Validação estrita prévia do fuso horário oficial da clínica no backend
      if (providers.lookupClinic) {
        try {
          const reliable = await reliableClinicResolver(request);
          if (!reliable.clinic.isTimeZoneValid) {
            return Response.json(
              {
                error:
                  "A clínica não possui fuso horário oficial configurado. Solicite a configuração ao administrador.",
              },
              {
                status: 400,
                headers: { "Cache-Control": "private, no-store", Vary: "Authorization, Host" },
              },
            );
          }
        } catch (error) {
          if (error instanceof AuthError && error.status !== 503) {
            const messages: Record<number, string> = {
              400: "Horário inválido",
              401: "Entre novamente para continuar",
              403: "Acesso não autorizado",
              404: "Clínica não encontrada",
            };
            return Response.json(
              { error: messages[error.status] ?? "Acesso não autorizado" },
              {
                status: error.status,
                headers: { "Cache-Control": "private, no-store", Vary: "Authorization, Host" },
              },
            );
          }
        }
      }
      return postEndpoint(request);
    },
    GET: async (request: Request): Promise<Response> => {
      return getEndpoint(request);
    },
    GET_CLINIC_CONTEXT: async (request: Request): Promise<Response> => {
      const headers = { "Cache-Control": "private, no-store", Vary: "Authorization, Host" };
      try {
        const reliable = await reliableClinicResolver(request);
        return Response.json(
          {
            clinic: {
              name: reliable.clinic.name,
              timeZone: reliable.clinic.timeZone,
              isTimeZoneValid: reliable.clinic.isTimeZoneValid,
            },
          },
          { headers },
        );
      } catch (error) {
        const status = error instanceof AuthError ? error.status : 503;
        const message =
          status === 401
            ? "Entre novamente para continuar"
            : status === 403
              ? "Acesso não autorizado"
              : status === 404
                ? "Clínica não encontrada"
                : "Informações da clínica temporariamente indisponíveis";
        return Response.json({ error: message }, { status, headers });
      }
    },
  };
}

export const agendaAvailabilityHandlers = createAgendaAvailabilityHandlers();
