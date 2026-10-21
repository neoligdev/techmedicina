import { z } from "zod";

export type DomainEnvironment = "clinic_portal" | "patient_pwa";

export type DomainStatus = "pending_verification" | "verified" | "active" | "suspended" | "retired";

export interface ReservedDomain {
  id: string;
  clinic_id: string;
  hostname: string;
  environment: DomainEnvironment;
  status: DomainStatus;
  revision: number;
  created_at: string;
}

export interface DomainAuditEvent {
  id: string;
  domain_id: string;
  actor_user_id: string;
  action: string;
  occurred_at: string;
}

export interface DomainDnsInstruction {
  name: string;
  type: "TXT";
  value: string;
  rawToken?: string | undefined;
  isTokenPending: boolean;
  hasConfirmedChallenge: boolean;
}

export function isValidClinicUuid(id: unknown): id is string {
  return typeof id === "string" && z.string().uuid().safeParse(id).success;
}

export function formatDomainEnvironment(env: DomainEnvironment): string {
  switch (env) {
    case "clinic_portal":
      return "Portal da Clínica e Médico";
    case "patient_pwa":
      return "PWA do Paciente";
    default:
      return env;
  }
}

export function getDomainStatusMeta(status: DomainStatus): {
  label: string;
  variant: "pending" | "verified" | "active" | "suspended" | "retired";
  description: string;
} {
  switch (status) {
    case "pending_verification":
      return {
        label: "Pendente de verificação",
        variant: "pending",
        description: "Aguardando apontamento DNS TXT e confirmação de titularidade.",
      };
    case "verified":
      return {
        label: "DNS Comprovado",
        variant: "verified",
        description: "Propriedade do domínio verificada; aguardando sonda HTTPS/TLS.",
      };
    case "active":
      return {
        label: "Ativo",
        variant: "active",
        description: "Domínio totalmente operacional e roteando tráfego.",
      };
    case "suspended":
      return {
        label: "Suspenso",
        variant: "suspended",
        description: "Resolução temporariamente bloqueada por decisão administrativa.",
      };
    case "retired":
      return {
        label: "Revogado",
        variant: "retired",
        description: "Domínio desativado e liberado do apontamento.",
      };
    default:
      return {
        label: status,
        variant: "pending",
        description: "Estado do domínio.",
      };
  }
}

export function getDomainDnsInstruction(hostname: string, token?: string): DomainDnsInstruction {
  const hasToken = Boolean(token && token.trim().length > 0);
  return {
    name: `_plugpix-verification.${hostname}`,
    type: "TXT",
    value: hasToken
      ? `plugpix-domain-verification=${token}`
      : "plugpix-domain-verification=<desafio_criptográfico_256bits>",
    rawToken: token,
    isTokenPending: !hasToken,
    hasConfirmedChallenge: hasToken,
  };
}
