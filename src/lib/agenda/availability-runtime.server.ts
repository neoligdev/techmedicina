import "@tanstack/react-start/server-only";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { resolveSupabaseContext } from "../auth/supabase-adapter.server";
import { createAvailabilityEndpoint } from "./availability-endpoint.server";
import { createAvailabilityReadEndpoint } from "./availability-read-endpoint.server";
import type { AvailabilityRpc } from "./availability-write.server";
import type { AvailabilityReader } from "./availability-read.server";
import { createAvailabilitySqlReader } from "./availability-sql-reader.server";

export interface AvailabilityRuntimeProviders<S extends { identity: AuthenticatedIdentity }> {
  lookup: (hostname: string) => Promise<unknown>;
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
 * Cria os manipuladores HTTP para a rota /api/agenda/availability.
 * Reutiliza os endpoints comprovados de escrita (D95) e leitura (D106),
 * garantindo autenticação obrigatória, autorização por perfil médico,
 * isolamento por domínio clínico, validação de payload, cabeçalhos privados
 * e barreira de segurança preventiva enquanto a migração 015 aguarda homologação.
 */
export function createAgendaAvailabilityHandlers<S extends { identity: AuthenticatedIdentity }>(
  customProviders?: AvailabilityRuntimeProviders<S>,
) {
  // Provedores padrão com integração Supabase e tratamento seguro de dependência ausente
  const defaultProviders: AvailabilityRuntimeProviders<{ identity: AuthenticatedIdentity }> = {
    lookup: async (hostname: string) => {
      // Lookup padrão seguro: em ambiente de produção sem tabela de domínios ativa,
      // retorna null de forma estrita, negando acesso a hosts não configurados (PRD White Label).
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
    resolveSession: async () => {
      const supabaseContext = await resolveSupabaseContext();
      if (!supabaseContext) return null;
      return { identity: supabaseContext.identity };
    },
    rpc: () => {
      return async (args) => {
        // Barreira preventiva do servidor: bloqueia chamadas sem infraestrutura homologada
        if (!isAgendaOperationalReady()) {
          return { data: null, error: { code: "503" } };
        }
        const supabaseContext = await resolveSupabaseContext();
        if (!supabaseContext) {
          return { data: null, error: { code: "503" } };
        }
        try {
          // Invoca a RPC de persistência local da migração 015
          // Se a migração 015 não estiver presente no banco remoto, falhará seguramente
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
        // Barreira preventiva do servidor sob RLS
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

  return {
    POST: async (request: Request): Promise<Response> => {
      return postEndpoint(request);
    },
    GET: async (request: Request): Promise<Response> => {
      return getEndpoint(request);
    },
  };
}

export const agendaAvailabilityHandlers = createAgendaAvailabilityHandlers();
