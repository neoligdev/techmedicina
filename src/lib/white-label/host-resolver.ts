/**
 * Módulo de Resolução de Host e Ambiente White Label (PRD v0.11.1 - Gate WL-1).
 * Implementa normalização estrita, confiança de proxy, validação anti-spoofing
 * e matriz de rotas seguras por ambiente (Central, Gestão Clínica, Médico e PWA Paciente).
 */

export type HostEnvironment = "central" | "clinic_portal" | "patient_pwa" | "demo";

export type DomainStatus = "active" | "pending_verification" | "suspended" | "retired";

export type RoutingArea = "super-admin" | "clinica" | "medico" | "paciente";

export interface HostRoutingPolicy {
  allowedAreas: RoutingArea[];
  defaultPath: string;
}

export interface DomainMappingEntry {
  hostname: string;
  environment: HostEnvironment;
  clinicId?: string | undefined;
  status: DomainStatus;
}

export type HostResolutionSuccess = {
  ok: true;
  host: string;
  environment: HostEnvironment;
  clinicId?: string | undefined;
  domainStatus: DomainStatus;
  isLocalOrPreview: boolean;
  routingPolicy: HostRoutingPolicy;
};

export type HostResolutionFailure = {
  ok: false;
  error:
    | "invalid_host"
    | "unknown_host"
    | "suspended_host"
    | "pending_host"
    | "reserved_name_violation"
    | "spoofing_detected";
  message: string;
  rawHost?: string;
};

export type HostResolutionResult = HostResolutionSuccess | HostResolutionFailure;

/**
 * Nomes de subdomínios/prefixos estritamente reservados pela plataforma.
 * Clínicas não podem registrar ou usar estes identificadores para portais ou PWAs.
 */
export const RESERVED_HOST_NAMES = new Set([
  "api",
  "admin",
  "super-admin",
  "internal",
  "health",
  "metrics",
  "status",
  "staus",
  "auth",
  "login",
  "cloud",
  "db",
  "mail",
  "smtp",
  "vpn",
  "platform",
  "billing",
  "static",
  "cdn",
]);

/**
 * Matriz canônica de rotas por ambiente conforme especificação PRD v0.11.1 §9.2.5–§9.2.7.
 */
export const ROUTING_POLICIES: Record<HostEnvironment, HostRoutingPolicy> = {
  central: {
    allowedAreas: ["super-admin"],
    defaultPath: "/super-admin",
  },
  clinic_portal: {
    allowedAreas: ["clinica", "medico"],
    defaultPath: "/clinica/agenda",
  },
  patient_pwa: {
    allowedAreas: ["paciente"],
    defaultPath: "/app",
  },
  demo: {
    allowedAreas: ["super-admin", "clinica", "medico", "paciente"],
    defaultPath: "/super-admin",
  },
};

/**
 * Normaliza um hostname removendo portas, trailing dots e convertendo para minúsculas.
 * Valida formato RFC 1035 / 1123 e caracteres permitidos.
 */
export function normalizeHost(rawHost: unknown): { host: string | null; error?: string } {
  if (typeof rawHost !== "string" || !rawHost.trim()) {
    return { host: null, error: "Host ausente ou vazio" };
  }

  let cleaned = rawHost.trim().toLowerCase();

  // Rejeita injeções ou caracteres proibidos
  if (/[\s/\\?#%<>{}[\]|]/.test(cleaned)) {
    return { host: null, error: "Caracteres inválidos ou injeção detectada" };
  }

  // Remove trailing dot do FQDN (ex: "example.com." -> "example.com")
  if (cleaned.endsWith(".")) {
    cleaned = cleaned.slice(0, -1);
  }

  // Se contiver porta, valida e extrai (ex: "localhost:3000" -> "localhost")
  const portColonIndex = cleaned.lastIndexOf(":");
  if (portColonIndex !== -1) {
    const portStr = cleaned.slice(portColonIndex + 1);
    if (!/^\d+$/.test(portStr)) return { host: null, error: "Porta inválida" };
    const port = Number(portStr);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return { host: null, error: "Porta inválida" };
    }
    cleaned = cleaned.slice(0, portColonIndex);
    if (cleaned.endsWith(".")) cleaned = cleaned.slice(0, -1);
  }

  if (!cleaned) {
    return { host: null, error: "Host vazio após normalização" };
  }

  // Limite total de comprimento DNS
  if (cleaned.length > 253) {
    return { host: null, error: "Comprimento do host excede limite de 253 caracteres" };
  }

  // Permitir "localhost" ou "127.0.0.1"
  if (cleaned === "localhost" || cleaned === "127.0.0.1") {
    return { host: cleaned };
  }

  // Validação de labels DNS (RFC 1123)
  const labels = cleaned.split(".");
  for (const label of labels) {
    if (!label) {
      return { host: null, error: "Label DNS vazio (pontos duplos)" };
    }
    if (label.length > 63) {
      return { host: null, error: "Label DNS excede limite de 63 caracteres" };
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      return { host: null, error: "Label DNS não pode iniciar ou terminar com hífen" };
    }
    if (!/^[a-z0-9-]+$/.test(label)) {
      return { host: null, error: "Caracteres inválidos no label DNS" };
    }
  }

  return { host: cleaned };
}

export interface ExtractHostOptions {
  trustedProxy?: boolean;
}

/**
 * Extrai o hostname confiável a partir dos cabeçalhos HTTP da requisição.
 * Se trustedProxy for falso, rejeita X-Forwarded-Host arbitrário como proteção anti-spoofing.
 */
export function extractTrustedHost(
  headers: Headers | Record<string, string | string[] | undefined>,
  options: ExtractHostOptions = {},
): { host: string | null; error?: string } {
  const getHeader = (key: string): string | null => {
    if ("get" in headers && typeof headers.get === "function") {
      return headers.get(key);
    }
    const rec = headers as Record<string, string | string[] | undefined>;
    const matches = Object.entries(rec).filter(
      ([name]) => name.toLowerCase() === key.toLowerCase(),
    );
    if (matches.length > 1) return "[ambiguous]";
    const val = matches[0]?.[1];
    if (Array.isArray(val)) return val.length === 1 ? (val[0] ?? null) : "[ambiguous]";
    return typeof val === "string" ? val : null;
  };

  const hostHeader = getHeader("host");
  const forwardedHost = getHeader("x-forwarded-host");
  if (
    hostHeader === "[ambiguous]" ||
    forwardedHost === "[ambiguous]" ||
    forwardedHost?.includes(",")
  ) {
    return { host: null, error: "Cabeçalhos de host ambíguos" };
  }

  let candidate: string | null = null;

  if (options.trustedProxy && forwardedHost) {
    // Pode conter lista separada por vírgula em múltiplos proxies
    const firstForwarded = forwardedHost.split(",")[0]?.trim();
    if (firstForwarded) {
      candidate = firstForwarded;
    }
  }

  if (!candidate) {
    candidate = hostHeader;
  }

  if (!candidate) {
    return { host: null, error: "Nenhum cabeçalho Host ou X-Forwarded-Host presente" };
  }

  // Se houver ambos e proxy NÃO for confiável, mas forwarded for diferente, registrar suspeita
  if (!options.trustedProxy && forwardedHost && hostHeader && forwardedHost !== hostHeader) {
    return { host: null, error: "Tentativa de spoofing com X-Forwarded-Host não confiável" };
  }

  return normalizeHost(candidate);
}

/**
 * Verifica se um host pertence ao ambiente local ou de preview autorizado.
 */
export function isLocalOrPreviewHost(host: string): boolean {
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    host.endsWith(".test")
  ) {
    return true;
  }
  if (host.endsWith(".lovableproject.com") || host.endsWith(".lovable.app")) {
    return true;
  }
  return false;
}

/**
 * Resolvedor de Host em Memória (suporta registro dinâmico de domínios).
 */
export class HostResolver {
  private domains = new Map<string, DomainMappingEntry>();

  constructor(initialEntries: DomainMappingEntry[] = []) {
    for (const entry of initialEntries) {
      const norm = normalizeHost(entry.hostname);
      if (norm.host) {
        if (this.domains.has(norm.host)) throw new Error("Catálogo de hosts contém duplicação");
        this.domains.set(norm.host, { ...entry, hostname: norm.host });
      }
    }
  }

  public registerDomain(entry: DomainMappingEntry): { ok: boolean; error?: string } {
    const norm = normalizeHost(entry.hostname);
    if (!norm.host) {
      return { ok: false, error: norm.error || "Hostname inválido" };
    }
    if (this.domains.has(norm.host)) {
      return { ok: false, error: "Hostname já cadastrado; atualização exige operação própria" };
    }

    const firstSubdomain = norm.host.split(".")[0];
    if (firstSubdomain && RESERVED_HOST_NAMES.has(firstSubdomain)) {
      return { ok: false, error: `Subdomínio '${firstSubdomain}' é reservado pela plataforma` };
    }

    this.domains.set(norm.host, { ...entry, hostname: norm.host });
    return { ok: true };
  }

  public resolveHost(rawHost: string): HostResolutionResult {
    const { host, error } = normalizeHost(rawHost);
    if (!host) {
      return {
        ok: false,
        error: "invalid_host",
        message: error || "Host inválido",
        rawHost,
      };
    }

    // Verifica subdomínio reservado em acessos desconhecidos
    const firstSubdomain = host.split(".")[0];
    if (firstSubdomain && RESERVED_HOST_NAMES.has(firstSubdomain) && !this.domains.has(host)) {
      return {
        ok: false,
        error: "reserved_name_violation",
        message: `Identificador '${firstSubdomain}' é reservado para serviços internos da plataforma`,
        rawHost,
      };
    }

    const isLocal = isLocalOrPreviewHost(host);

    // Domínio cadastrado diretamente
    const entry = this.domains.get(host);
    if (entry) {
      if (entry.status === "suspended") {
        return {
          ok: false,
          error: "suspended_host",
          message: "O domínio desta clínica está suspenso temporariamente",
          rawHost,
        };
      }
      if (entry.status === "pending_verification") {
        return {
          ok: false,
          error: "pending_host",
          message: "O domínio aguarda verificação de propriedade DNS",
          rawHost,
        };
      }
      if (entry.status === "retired") {
        return {
          ok: false,
          error: "unknown_host",
          message: "Este domínio foi desativado e não atende mais requisições",
          rawHost,
        };
      }

      return {
        ok: true,
        host,
        environment: entry.environment,
        clinicId: entry.clinicId,
        domainStatus: entry.status,
        isLocalOrPreview: isLocal,
        routingPolicy: ROUTING_POLICIES[entry.environment],
      };
    }

    // Se for host local ou preview do Lovable não cadastrado, atribui modo demonstrativo seguro
    if (isLocal) {
      return {
        ok: true,
        host,
        environment: "demo",
        domainStatus: "active",
        isLocalOrPreview: true,
        routingPolicy: ROUTING_POLICIES.demo,
      };
    }

    // Host desconhecido
    return {
      ok: false,
      error: "unknown_host",
      message: "Domínio não cadastrado ou não reconhecido na rede Techmedicina",
      rawHost,
    };
  }

  /**
   * Valida se uma determinada rota é permitida no ambiente resolvido.
   * Evita vazamento do Super ADM no PWA do paciente ou tela do paciente no Super ADM.
   */
  public isRouteAllowed(result: HostResolutionResult, pathname: string): boolean {
    if (!result.ok) return false;

    // Contrato de rotas da aplicação; assets e APIs exigem políticas próprias.
    // Recusa codificação e caminhos não canônicos antes de classificar a área.
    if (
      !pathname.startsWith("/") ||
      /[%\\?#]/.test(pathname) ||
      pathname.includes("//") ||
      pathname.split("/").some((segment) => segment === "." || segment === "..")
    )
      return false;
    if (pathname === "/" || pathname === "/login" || pathname === "/api/health") {
      return true;
    }
    if (pathname === "/staus")
      return result.environment === "central" || result.environment === "demo";

    const area = this.extractAreaFromPath(pathname);
    if (!area) return false;

    return result.routingPolicy.allowedAreas.includes(area);
  }

  private extractAreaFromPath(pathname: string): RoutingArea | null {
    const segment = pathname.split("/")[1];
    if (segment === "super-admin") return "super-admin";
    if (segment === "clinica") return "clinica";
    if (segment === "medico") return "medico";
    if (segment === "app" || segment === "paciente") return "paciente";
    return null;
  }
}

/**
 * Instância padrão pré-configurada para o ecossistema Techmedicina.
 */
export const defaultHostResolver = new HostResolver([
  {
    hostname: "central.plugpix.com.br",
    environment: "central",
    status: "active",
  },
  {
    hostname: "admin.plugpix.com.br",
    environment: "central",
    status: "active",
  },
]);
