import { describe, expect, it } from "vitest";
import {
  HostResolver,
  extractTrustedHost,
  normalizeHost,
  isLocalOrPreviewHost,
  RESERVED_HOST_NAMES,
} from "../lib/white-label/host-resolver";

describe("White Label Gate WL-1: Normalização de Host e Confiança de Proxy", () => {
  it("rejeita portas numéricas ambíguas e aceita FQDN com porta", () => {
    expect(normalizeHost("clinica.test:1e3").host).toBeNull();
    expect(normalizeHost("clinica.test:+443").host).toBeNull();
    expect(normalizeHost("clinica.test.:443").host).toBe("clinica.test");
  });
  it("não escolhe um host de cabeçalhos duplicados ou listas de proxy", () => {
    expect(extractTrustedHost({ Host: "a.test", host: "b.test" }).host).toBeNull();
    expect(extractTrustedHost({ host: ["a.test", "b.test"] }).host).toBeNull();
    expect(extractTrustedHost({ Host: "a.test" }).host).toBe("a.test");
    expect(
      extractTrustedHost(new Headers({ host: "proxy.test", "x-forwarded-host": "a.test,b.test" }), {
        trustedProxy: true,
      }).host,
    ).toBeNull();
  });
  it("não transfere silenciosamente um domínio para outra clínica", () => {
    const resolver = new HostResolver([
      {
        hostname: "gestao.clinica.test",
        environment: "clinic_portal",
        clinicId: "A",
        status: "active",
      },
    ]);
    expect(
      resolver.registerDomain({
        hostname: "GESTAO.CLINICA.TEST",
        environment: "clinic_portal",
        clinicId: "B",
        status: "active",
      }).ok,
    ).toBe(false);
    const result = resolver.resolveHost("gestao.clinica.test");
    expect(result.ok && result.clinicId).toBe("A");
    expect(
      () =>
        new HostResolver([
          {
            hostname: "gestao.clinica.test",
            environment: "clinic_portal",
            clinicId: "A",
            status: "active",
          },
          {
            hostname: "GESTAO.CLINICA.TEST",
            environment: "clinic_portal",
            clinicId: "B",
            status: "active",
          },
        ]),
    ).toThrow("duplicação");
  });
  it("normaliza hostname removendo trailing dots, portas e aplicando lowercase", () => {
    expect(normalizeHost("ClInIcA-A.PlUgPiX.CoM.").host).toBe("clinica-a.plugpix.com");
    expect(normalizeHost("clinica-b.plugpix.com:3000").host).toBe("clinica-b.plugpix.com");
    expect(normalizeHost("portal.saude.com.br:443.").host).toBe("portal.saude.com.br");
    expect(normalizeHost("  LOCALHOST:8080  ").host).toBe("localhost");
  });

  it("rejeita host inválido, com injeção de caracteres ou portas fora do intervalo", () => {
    expect(normalizeHost("").host).toBeNull();
    expect(normalizeHost("   ").host).toBeNull();
    expect(normalizeHost("clinica/hack.com").host).toBeNull();
    expect(normalizeHost("clinica..com").host).toBeNull();
    expect(normalizeHost("-clinica.com").host).toBeNull();
    expect(normalizeHost("clinica-.com").host).toBeNull();
    expect(normalizeHost("clinica.com:99999").host).toBeNull();
    expect(normalizeHost("clinica.com:abc").host).toBeNull();
    expect(normalizeHost("clinica<script>.com").host).toBeNull();
  });

  it("extrai host confiável de cabeçalhos com proteção contra spoofing", () => {
    // 1) Sem trustedProxy: ignora ou rejeita X-Forwarded-Host falso
    const spoofHeaders = new Headers({
      host: "central.plugpix.com.br",
      "x-forwarded-host": "malicious-hacker.com",
    });
    const resultSpoof = extractTrustedHost(spoofHeaders, { trustedProxy: false });
    expect(resultSpoof.host).toBeNull();
    expect(resultSpoof.error).toContain("spoofing");

    // 2) Sem proxy: usa Host direto
    const directHeaders = new Headers({
      host: "central.plugpix.com.br:80",
    });
    expect(extractTrustedHost(directHeaders).host).toBe("central.plugpix.com.br");

    // 3) Com trustedProxy ativo: aceita o cliente original de X-Forwarded-Host
    const trustedHeaders = new Headers({
      host: "internal-loadbalancer.local",
      "x-forwarded-host": "portal.clinica-alpha.com.br",
    });
    const resultTrusted = extractTrustedHost(trustedHeaders, { trustedProxy: true });
    expect(resultTrusted.host).toBe("portal.clinica-alpha.com.br");
  });

  it("reconhece hosts de desenvolvimento local e preview Lovable", () => {
    expect(isLocalOrPreviewHost("localhost")).toBe(true);
    expect(isLocalOrPreviewHost("127.0.0.1")).toBe(true);
    expect(isLocalOrPreviewHost("app.local")).toBe(true);
    expect(isLocalOrPreviewHost("preview-123.lovableproject.com")).toBe(true);
    expect(isLocalOrPreviewHost("preview-xyz.lovable.app")).toBe(true);
    expect(isLocalOrPreviewHost("clinica-externa.com.br")).toBe(false);
  });
});

describe("White Label Gate WL-1: Resolução de Ambientes, Nomes Reservados e Estados", () => {
  const clinicAId = "00000000-0000-4000-8000-000000000001";
  const clinicBId = "00000000-0000-4000-8000-000000000002";

  const resolver = new HostResolver([
    {
      hostname: "central.plugpix.com.br",
      environment: "central",
      status: "active",
    },
    {
      hostname: "gestao.clinica-a.com.br",
      environment: "clinic_portal",
      clinicId: clinicAId,
      status: "active",
    },
    {
      hostname: "app.clinica-a.com.br",
      environment: "patient_pwa",
      clinicId: clinicAId,
      status: "active",
    },
    {
      hostname: "gestao.clinica-b.com.br",
      environment: "clinic_portal",
      clinicId: clinicBId,
      status: "active",
    },
    {
      hostname: "app.clinica-b.com.br",
      environment: "patient_pwa",
      clinicId: clinicBId,
      status: "active",
    },
    {
      hostname: "pendente.clinica-c.com.br",
      environment: "clinic_portal",
      status: "pending_verification",
    },
    {
      hostname: "suspensa.clinica-d.com.br",
      environment: "clinic_portal",
      status: "suspended",
    },
    {
      hostname: "antiga.clinica-e.com.br",
      environment: "clinic_portal",
      status: "retired",
    },
  ]);

  it("resolve corretamente o host central para gestão PlugPix", () => {
    const res = resolver.resolveHost("central.plugpix.com.br:443");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.environment).toBe("central");
      expect(res.clinicId).toBeUndefined();
      expect(res.routingPolicy.defaultPath).toBe("/super-admin");
    }
  });

  it("resolve portais de gestão e PWAs de pacientes para Clínicas A e B com isolamento de tenant", () => {
    const gestaoA = resolver.resolveHost("gestao.clinica-a.com.br");
    expect(gestaoA.ok).toBe(true);
    if (gestaoA.ok) {
      expect(gestaoA.environment).toBe("clinic_portal");
      expect(gestaoA.clinicId).toBe(clinicAId);
    }

    const appA = resolver.resolveHost("app.clinica-a.com.br");
    expect(appA.ok).toBe(true);
    if (appA.ok) {
      expect(appA.environment).toBe("patient_pwa");
      expect(appA.clinicId).toBe(clinicAId);
      expect(appA.routingPolicy.defaultPath).toBe("/app");
    }

    const appB = resolver.resolveHost("app.clinica-b.com.br");
    expect(appB.ok).toBe(true);
    if (appB.ok) {
      expect(appB.environment).toBe("patient_pwa");
      expect(appB.clinicId).toBe(clinicBId);
      expect(appB.clinicId).not.toBe(clinicAId);
    }
  });

  it("bloqueia domínios em estado pendente, suspenso ou aposentado sem expor dados", () => {
    const pendente = resolver.resolveHost("pendente.clinica-c.com.br");
    expect(pendente.ok).toBe(false);
    if (!pendente.ok) {
      expect(pendente.error).toBe("pending_host");
    }

    const suspensa = resolver.resolveHost("suspensa.clinica-d.com.br");
    expect(suspensa.ok).toBe(false);
    if (!suspensa.ok) {
      expect(suspensa.error).toBe("suspended_host");
    }

    const antiga = resolver.resolveHost("antiga.clinica-e.com.br");
    expect(antiga.ok).toBe(false);
    if (!antiga.ok) {
      expect(antiga.error).toBe("unknown_host");
    }
  });

  it("rejeita subdomínios reservados não registrados", () => {
    const resAuth = resolver.resolveHost("auth.qualquer-clinica.com");
    expect(resAuth.ok).toBe(false);
    if (!resAuth.ok) {
      expect(resAuth.error).toBe("reserved_name_violation");
    }

    const resAdmin = resolver.resolveHost("admin.desconhecido.com");
    expect(resAdmin.ok).toBe(false);
    if (!resAdmin.ok) {
      expect(resAdmin.error).toBe("reserved_name_violation");
    }
  });

  it("impede registro de subdomínio com nome reservado", () => {
    const reg = resolver.registerDomain({
      hostname: "super-admin.nova-clinica.com",
      environment: "clinic_portal",
      status: "active",
    });
    expect(reg.ok).toBe(false);
    expect(reg.error).toContain("reservado");
  });

  it("atribui modo demonstrativo seguro para localhost e previews do Lovable", () => {
    const local = resolver.resolveHost("localhost:5173");
    expect(local.ok).toBe(true);
    if (local.ok) {
      expect(local.environment).toBe("demo");
      expect(local.isLocalOrPreview).toBe(true);
    }

    const preview = resolver.resolveHost("meu-app-lovable.lovableproject.com");
    expect(preview.ok).toBe(true);
    if (preview.ok) {
      expect(preview.environment).toBe("demo");
    }
  });
});

describe("White Label Gate WL-1: Matriz de Rotas por Ambiente", () => {
  const resolver = new HostResolver([
    {
      hostname: "central.plugpix.com.br",
      environment: "central",
      status: "active",
    },
    {
      hostname: "gestao.clinica-a.com.br",
      environment: "clinic_portal",
      clinicId: "00000000-0000-4000-8000-000000000001",
      status: "active",
    },
    {
      hostname: "app.clinica-a.com.br",
      environment: "patient_pwa",
      clinicId: "00000000-0000-4000-8000-000000000001",
      status: "active",
    },
  ]);

  it("no PWA do paciente (app.clinica-a), permite apenas rotas de paciente e bloqueia Super ADM e gestão", () => {
    const pwa = resolver.resolveHost("app.clinica-a.com.br");
    expect(pwa.ok).toBe(true);

    // Permitido
    expect(resolver.isRouteAllowed(pwa, "/app")).toBe(true);
    expect(resolver.isRouteAllowed(pwa, "/paciente/agenda")).toBe(true);
    expect(resolver.isRouteAllowed(pwa, "/login")).toBe(true);

    // Terminantemente proibido
    expect(resolver.isRouteAllowed(pwa, "/super-admin")).toBe(false);
    expect(resolver.isRouteAllowed(pwa, "/clinica/agenda")).toBe(false);
    expect(resolver.isRouteAllowed(pwa, "/medico/pacientes")).toBe(false);
  });

  it("no portal da clínica (gestao.clinica-a), permite clínica e médico, bloqueando Super ADM e PWA", () => {
    const portal = resolver.resolveHost("gestao.clinica-a.com.br");
    expect(portal.ok).toBe(true);

    // Permitido
    expect(resolver.isRouteAllowed(portal, "/clinica/agenda")).toBe(true);
    expect(resolver.isRouteAllowed(portal, "/clinica/personalizacao")).toBe(true);
    expect(resolver.isRouteAllowed(portal, "/medico/agenda")).toBe(true);

    // Proibido
    expect(resolver.isRouteAllowed(portal, "/super-admin")).toBe(false);
    expect(resolver.isRouteAllowed(portal, "/app")).toBe(false);
  });

  it("no host central (central.plugpix), permite apenas super-admin e bloqueia áreas de clínicas", () => {
    const central = resolver.resolveHost("central.plugpix.com.br");
    expect(central.ok).toBe(true);

    // Permitido
    expect(resolver.isRouteAllowed(central, "/super-admin")).toBe(true);
    expect(resolver.isRouteAllowed(central, "/login")).toBe(true);

    // Proibido
    expect(resolver.isRouteAllowed(central, "/app")).toBe(false);
    expect(resolver.isRouteAllowed(central, "/clinica/agenda")).toBe(false);
    expect(resolver.isRouteAllowed(central, "/medico")).toBe(false);
  });
  it("nega caminhos desconhecidos, prefixos semelhantes e caminhos ambíguos", () => {
    const pwa = resolver.resolveHost("app.clinica-a.com.br");
    for (const path of [
      "/unknown",
      "/application",
      "/app-admin",
      "/api/health-admin",
      "/api/platform/clinics",
      "/app/../super-admin",
      "/app/%2e%2e/super-admin",
      "/app\\super-admin",
      "//app",
      "/app?area=central",
      "app",
      "/app/./agenda",
    ])
      expect(resolver.isRouteAllowed(pwa, path), path).toBe(false);
    expect(resolver.isRouteAllowed(pwa, "/app/agenda")).toBe(true);
    expect(resolver.isRouteAllowed(pwa, "/api/health")).toBe(true);
  });
  it("mantém status temporário somente nos ambientes central e demo", () => {
    expect(resolver.isRouteAllowed(resolver.resolveHost("central.plugpix.com.br"), "/staus")).toBe(
      true,
    );
    expect(resolver.isRouteAllowed(resolver.resolveHost("localhost"), "/staus")).toBe(true);
    expect(resolver.isRouteAllowed(resolver.resolveHost("gestao.clinica-a.com.br"), "/staus")).toBe(
      false,
    );
    expect(resolver.isRouteAllowed(resolver.resolveHost("app.clinica-a.com.br"), "/staus")).toBe(
      false,
    );
  });
});
