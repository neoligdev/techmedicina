import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { resolveSupabaseContext } from "../auth/supabase-adapter.server";
import {
  extractTrustedHost,
  isLocalOrPreviewHost,
  normalizeHost,
  RESERVED_HOST_NAMES,
  type ExtractHostOptions,
} from "../white-label/host-resolver";
import { isValidIanaTimeZone } from "../../features/agenda/local-time";

const domainRecordSchema = z
  .object({
    hostname: z.string(),
    clinicId: z.string().uuid(),
    environment: z.enum(["clinic_portal", "patient_pwa"]),
    status: z.enum(["active", "pending_verification", "suspended", "retired"]),
  })
  .strict();

const clinicRecordSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(2).max(160),
    is_active: z.boolean(),
    time_zone: z.string().nullable().optional(),
  })
  .passthrough();

export interface ReliableClinicContext {
  clinic: {
    id: string;
    name: string;
    isActive: boolean;
    timeZone: string | null;
    isTimeZoneValid: boolean;
  };
  domain: {
    hostname: string;
    environment: "clinic_portal" | "patient_pwa";
    status: "active";
  };
  session: {
    userId: string;
    role: string;
    medicalIdentityVerified: boolean;
    grants: Array<{ resource: string; action: string }>;
  };
}

export interface ClinicHostResolverProviders<S extends { identity: AuthenticatedIdentity }> {
  lookupDomain: (hostname: string) => Promise<unknown>;
  lookupClinic: (clinicId: string) => Promise<unknown>;
  resolveSession: (request: Request) => Promise<S | null>;
}

export async function defaultLookupClinicDomain(hostname: string) {
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
      .from("tm_clinic_domains")
      .select("hostname,clinic_id,environment,status")
      .eq("hostname", hostname)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as {
      hostname: string;
      clinic_id: string;
      environment: "clinic_portal" | "patient_pwa";
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
}

export async function defaultLookupClinicRecord(clinicId: string) {
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
}

/**
 * Cria um resolvedor confiável e estrito da clínica associada ao domínio ativo da requisição.
 * Server-only. Valida correspondência unívoca entre domínio, clínica cadastrada, situação ativa,
 * sessão autenticada do usuário e autorização específica para o ambiente.
 *
 * Não aceita clinicId ou timeZone fornecidos pelo cliente/navegador como autoridade.
 */
export function createReliableClinicResolver<S extends { identity: AuthenticatedIdentity }>(
  environment: "clinic_portal" | "patient_pwa",
  customProviders?: ClinicHostResolverProviders<S>,
  proxyOptions: ExtractHostOptions = {},
) {
  const defaultProviders: ClinicHostResolverProviders<{ identity: AuthenticatedIdentity }> = {
    lookupDomain: defaultLookupClinicDomain,
    lookupClinic: defaultLookupClinicRecord,
    resolveSession: async () => {
      const supabaseContext = await resolveSupabaseContext();
      if (!supabaseContext) return null;
      return { identity: supabaseContext.identity };
    },
  };

  const providers = (customProviders ??
    defaultProviders) as unknown as ClinicHostResolverProviders<S>;

  return async (request: Request): Promise<ReliableClinicContext> => {
    const extracted = extractTrustedHost(request.headers, proxyOptions);
    const authority = normalizeHost(new URL(request.url).host);

    if (
      !extracted.host ||
      (!proxyOptions.trustedProxy && authority.host !== extracted.host) ||
      isLocalOrPreviewHost(extracted.host) ||
      RESERVED_HOST_NAMES.has(extracted.host.split(".")[0]!)
    ) {
      throw new AuthError("Clinical host denied", 403);
    }

    const domainRaw = await providers.lookupDomain(extracted.host);
    const domainParsed = domainRecordSchema.safeParse(domainRaw);
    if (
      !domainParsed.success ||
      domainParsed.data.hostname !== extracted.host ||
      domainParsed.data.environment !== environment ||
      domainParsed.data.status !== "active"
    ) {
      throw new AuthError("Clinical host denied", 403);
    }
    const domain = domainParsed.data;

    const clinicRaw = await providers.lookupClinic(domain.clinicId);
    const clinicParsed = clinicRecordSchema.safeParse(clinicRaw);
    if (!clinicParsed.success || clinicParsed.data.id !== domain.clinicId) {
      throw new AuthError("Clínica não encontrada", 404);
    }
    const clinic = clinicParsed.data;

    if (!clinic.is_active) {
      throw new AuthError("Clínica inativa ou suspensa", 403);
    }

    const session = await providers.resolveSession(request);
    if (!session) {
      throw new AuthError("Sessão não confirmada", 401);
    }

    const links = session.identity.links.filter(
      (link) => link.clinicId === clinic.id && link.isActive,
    );
    if (links.length !== 1) {
      throw new AuthError("Acesso não autorizado para esta clínica", 403);
    }
    const link = links[0]!;

    if (environment === "clinic_portal") {
      const isAllowedDoctor = link.role === "medico" && link.medicalIdentityVerified === true;
      const isAllowedAdmin = link.role === "admin";
      if (!isAllowedDoctor && !isAllowedAdmin) {
        throw new AuthError("Perfil clínico não autorizado", 403);
      }
    } else if (environment === "patient_pwa") {
      if (link.role !== "paciente" || !link.patientId) {
        throw new AuthError("Perfil de paciente não autorizado", 403);
      }
    }

    const rawTimeZone = clinic.time_zone ? clinic.time_zone.trim() : null;
    const isTimeZoneValid = rawTimeZone !== null && isValidIanaTimeZone(rawTimeZone);

    return {
      clinic: {
        id: clinic.id,
        name: clinic.name,
        isActive: clinic.is_active,
        timeZone: isTimeZoneValid ? rawTimeZone : null,
        isTimeZoneValid,
      },
      domain: {
        hostname: domain.hostname,
        environment: domain.environment,
        status: "active" as const,
      },
      session: {
        userId: session.identity.userId,
        role: link.role,
        medicalIdentityVerified: Boolean(link.medicalIdentityVerified),
        grants: link.grants ?? [],
      },
    };
  };
}
