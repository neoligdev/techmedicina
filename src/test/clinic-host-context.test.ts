import { describe, expect, it, vi } from "vitest";
import { createReliableClinicResolver } from "@/lib/clinic/clinic-host-context.server";
import { createAgendaAvailabilityHandlers } from "@/lib/agenda/availability-runtime.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";

const clinicAId = "11111111-1111-4111-8111-111111111111";
const clinicBId = "22222222-2222-4222-8222-222222222222";
const doctorUserId = "33333333-3333-4333-8333-333333333333";

function createIdentity(
  clinicId: string,
  overrides: Partial<AuthenticatedIdentity["links"][0]> = {},
): AuthenticatedIdentity {
  return {
    userId: doctorUserId,
    links: [
      {
        clinicId,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: [
          { resource: "agenda", action: "write" },
          { resource: "agenda", action: "read" },
        ],
        ...overrides,
      },
    ],
  };
}

describe("Resolução Confiável de Clínica e Fuso Horário no Servidor (D110)", () => {
  it("recupera fuso IANA oficial persistido e confirma correspondência de domínio e sessão", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async (hostname: string) => ({
        hostname,
        clinicId: clinicAId,
        environment: "clinic_portal",
        status: "active",
      }),
      lookupClinic: async (id: string) => ({
        id,
        name: "Clínica Salvador",
        is_active: true,
        time_zone: "America/Bahia",
      }),
      resolveSession: async () => ({ identity: createIdentity(clinicAId) }),
    });

    const req = new Request("https://portal.clinicasalvador.com/api/agenda/clinic", {
      headers: { host: "portal.clinicasalvador.com" },
    });

    const result = await resolver(req);
    expect(result.clinic.id).toBe(clinicAId);
    expect(result.clinic.name).toBe("Clínica Salvador");
    expect(result.clinic.isActive).toBe(true);
    expect(result.clinic.timeZone).toBe("America/Bahia");
    expect(result.clinic.isTimeZoneValid).toBe(true);
    expect(result.session.userId).toBe(doctorUserId);
  });

  it("identifica formalmente clínica sem fuso configurado (timeZone: null, isTimeZoneValid: false)", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async (hostname: string) => ({
        hostname,
        clinicId: clinicAId,
        environment: "clinic_portal",
        status: "active",
      }),
      lookupClinic: async (id: string) => ({
        id,
        name: "Clínica Sem Fuso",
        is_active: true,
        time_zone: null,
      }),
      resolveSession: async () => ({ identity: createIdentity(clinicAId) }),
    });

    const req = new Request("https://portal.clinicasemfuso.com/api/agenda/clinic", {
      headers: { host: "portal.clinicasemfuso.com" },
    });

    const result = await resolver(req);
    expect(result.clinic.timeZone).toBeNull();
    expect(result.clinic.isTimeZoneValid).toBe(false);
  });

  it("rejeita domínio não reconhecido ou com status inativo com erro 403", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async () => null, // Domínio não existe na base
      lookupClinic: async () => null,
      resolveSession: async () => ({ identity: createIdentity(clinicAId) }),
    });

    const req = new Request("https://desconhecido.com/api/agenda/clinic", {
      headers: { host: "desconhecido.com" },
    });

    await expect(resolver(req)).rejects.toMatchObject({ status: 403 });
  });

  it("rejeita clínica inativa com status 403", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async (hostname: string) => ({
        hostname,
        clinicId: clinicAId,
        environment: "clinic_portal",
        status: "active",
      }),
      lookupClinic: async (id: string) => ({
        id,
        name: "Clínica Inativa",
        is_active: false,
        time_zone: "America/Bahia",
      }),
      resolveSession: async () => ({ identity: createIdentity(clinicAId) }),
    });

    const req = new Request("https://portal.clinicainativa.com/api/agenda/clinic", {
      headers: { host: "portal.clinicainativa.com" },
    });

    await expect(resolver(req)).rejects.toMatchObject({ status: 403 });
  });

  it("rejeita requisição quando a sessão está revogada ou ausente com status 401", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async (hostname: string) => ({
        hostname,
        clinicId: clinicAId,
        environment: "clinic_portal",
        status: "active",
      }),
      lookupClinic: async (id: string) => ({
        id,
        name: "Clínica Ativa",
        is_active: true,
        time_zone: "America/Bahia",
      }),
      resolveSession: async () => null, // Sem sessão
    });

    const req = new Request("https://portal.clinica.com/api/agenda/clinic", {
      headers: { host: "portal.clinica.com" },
    });

    await expect(resolver(req)).rejects.toMatchObject({ status: 401 });
  });

  it("rejeita tentativa de acesso de usuário vinculado a outra clínica (multi-tenant) com status 403", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async (hostname: string) => ({
        hostname,
        clinicId: clinicAId, // Domínio é da Clínica A
        environment: "clinic_portal",
        status: "active",
      }),
      lookupClinic: async (id: string) => ({
        id,
        name: "Clínica A",
        is_active: true,
        time_zone: "America/Bahia",
      }),
      resolveSession: async () => ({
        identity: createIdentity(clinicBId), // Usuário é vinculado somente à Clínica B
      }),
    });

    const req = new Request("https://portal.clinica-a.com/api/agenda/clinic", {
      headers: { host: "portal.clinica-a.com" },
    });

    await expect(resolver(req)).rejects.toMatchObject({ status: 403 });
  });

  it("endpoint GET_CLINIC_CONTEXT responde com dados confiáveis da clínica e cabeçalhos privados", async () => {
    const handlers = createAgendaAvailabilityHandlers({
      lookup: async (hostname: string) => ({
        hostname,
        clinicId: clinicAId,
        environment: "clinic_portal",
        status: "active",
      }),
      lookupClinic: async () => ({
        id: clinicAId,
        name: "Clínica São Paulo",
        is_active: true,
        time_zone: "America/Sao_Paulo",
      }),
      resolveSession: async () => ({ identity: createIdentity(clinicAId) }),
      rpc: () => vi.fn(),
      reader: () => vi.fn(),
    });

    const req = new Request("https://portal.clinica.com/api/agenda/clinic", {
      headers: { host: "portal.clinica.com", Authorization: "Bearer valid_token" },
    });

    const res = await handlers.GET_CLINIC_CONTEXT(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("Vary")).toBe("Authorization, Host");

    const body = (await res.json()) as {
      clinic: { name: string; timeZone: string | null; isTimeZoneValid: boolean };
    };
    expect(body.clinic.name).toBe("Clínica São Paulo");
    expect(body.clinic.timeZone).toBe("America/Sao_Paulo");
    expect(body.clinic.isTimeZoneValid).toBe(true);
  });

  it("POST /api/agenda/availability rejeita cadastro se a clínica não tem fuso oficial configurado", async () => {
    const handlers = createAgendaAvailabilityHandlers({
      lookup: async (hostname: string) => ({
        hostname,
        clinicId: clinicAId,
        environment: "clinic_portal",
        status: "active",
      }),
      lookupClinic: async () => ({
        id: clinicAId,
        name: "Clínica Sem Fuso",
        is_active: true,
        time_zone: null, // Sem fuso
      }),
      resolveSession: async () => ({ identity: createIdentity(clinicAId) }),
      rpc: () => vi.fn(),
      reader: () => vi.fn(),
    });

    const req = new Request("https://portal.clinica.com/api/agenda/availability", {
      method: "POST",
      headers: {
        host: "portal.clinica.com",
        Authorization: "Bearer valid_token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceRequestId: "44444444-4444-4444-8444-444444444444",
        interval: {
          startsAt: "2026-10-21T12:00:00Z",
          endsAt: "2026-10-21T13:00:00Z",
        },
      }),
    });

    const res = await handlers.POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("A clínica não possui fuso horário oficial configurado");
  });
});
