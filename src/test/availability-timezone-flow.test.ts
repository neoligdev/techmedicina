import { describe, expect, it, vi } from "vitest";
import { clinicTimeToInstant, isValidIanaTimeZone } from "@/features/agenda/local-time";
import { formatTimeZoneLabel, COMMON_TIME_ZONES } from "@/features/agenda/time-zones";
import {
  createAgendaAvailabilityHandlers,
  isAgendaOperationalReady,
} from "@/lib/agenda/availability-runtime.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";

const clinicBahiaId = "11111111-1111-4111-8111-111111111111";
const clinicManausId = "22222222-2222-4222-8222-222222222222";
const doctorUserId = "33333333-3333-4333-8333-333333333333";

function createIdentity(clinicId: string): AuthenticatedIdentity {
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
      },
    ],
  };
}

describe("Fluxo de Fuso Horário e Integridade da Agenda Médica (D110)", () => {
  it("validação IANA: aceita fusos válidos e rejeita fusos nulos, vazios ou corrompidos", () => {
    // Válidos
    expect(isValidIanaTimeZone("America/Sao_Paulo")).toBe(true);
    expect(isValidIanaTimeZone("America/Bahia")).toBe(true);
    expect(isValidIanaTimeZone("America/Manaus")).toBe(true);
    expect(isValidIanaTimeZone("UTC")).toBe(true);
    expect(isValidIanaTimeZone("Europe/London")).toBe(true);

    // Inválidos
    expect(isValidIanaTimeZone(null)).toBe(false);
    expect(isValidIanaTimeZone(undefined)).toBe(false);
    expect(isValidIanaTimeZone("")).toBe(false);
    expect(isValidIanaTimeZone("   ")).toBe(false);
    expect(isValidIanaTimeZone("America/CidadeInexistente")).toBe(false);
    expect(isValidIanaTimeZone("Invalido; DROP TABLE")).toBe(false);
    expect(isValidIanaTimeZone(123)).toBe(false);
  });

  it("exibição amigável: formata nomes de fusos comuns e desconhecidos adequadamente", () => {
    expect(formatTimeZoneLabel("America/Bahia")).toContain("Salvador (Bahia)");
    expect(formatTimeZoneLabel("America/Sao_Paulo")).toContain("Horário de Brasília");
    expect(formatTimeZoneLabel(null)).toBe("Não configurado");
    expect(formatTimeZoneLabel("")).toBe("Não configurado");
    expect(formatTimeZoneLabel("Europe/Lisbon")).toBe("Europe/Lisbon");
    expect(formatTimeZoneLabel("Fuso/Invalido")).toContain("(inválido)");
  });

  it("fusos diferentes em clínicas distintas: calcula instantes UTC distintos para o mesmo horário de parede", () => {
    // 12:00 em Salvador (UTC-3)
    const instantBahia = clinicTimeToInstant("2026-10-21T12:00", "America/Bahia");
    expect(instantBahia).toBe("2026-10-21T15:00:00.000Z");

    // 12:00 em Manaus (UTC-4)
    const instantManaus = clinicTimeToInstant("2026-10-21T12:00", "America/Manaus");
    expect(instantManaus).toBe("2026-10-21T16:00:00.000Z");

    // Diferença exata de 1 hora entre os fusos brasileiros
    const diffHours = (Date.parse(instantManaus) - Date.parse(instantBahia)) / (1000 * 60 * 60);
    expect(diffHours).toBe(1);
  });

  it("horário de verão inexistente (gap): rejeita horário que não existe com erro instrutivo", () => {
    // Em 15/10/2017 no Brasil (America/Sao_Paulo), o relógio avançou de 00:00 para 01:00 (00:30 não existiu)
    expect(() => clinicTimeToInstant("2017-10-15T00:30", "America/Sao_Paulo")).toThrow(
      /Este horário não existe no fuso da clínica/i,
    );
  });

  it("horário de verão ambíguo (fold): rejeita horário que ocorre duas vezes com erro instrutivo", () => {
    // Em 18/02/2018 no Brasil (America/Sao_Paulo), o relógio atrasou de 00:00 para 23:00 (23:30 repetiu)
    expect(() => clinicTimeToInstant("2018-02-17T23:30", "America/Sao_Paulo")).toThrow(
      /Este horário é ambíguo no fuso da clínica/i,
    );
  });

  it("persistência em UTC: converte horário local válido e gera instante UTC exato", () => {
    const instant = clinicTimeToInstant("2026-11-05T09:30", "America/Bahia");
    expect(instant).toBe("2026-11-05T12:30:00.000Z");
    const date = new Date(instant);
    expect(date.toISOString()).toBe("2026-11-05T12:30:00.000Z");
  });

  it("agenda desabilitada: barreira de segurança 503 permanece ativa enquanto infraestrutura Cloud aguarda homologação", async () => {
    expect(isAgendaOperationalReady()).toBe(false);

    const handlers = createAgendaAvailabilityHandlers({
      lookup: async (hostname: string) => ({
        hostname,
        clinicId: clinicBahiaId,
        environment: "clinic_portal",
        status: "active",
      }),
      lookupClinic: async () => ({
        id: clinicBahiaId,
        name: "Clínica Bahia",
        is_active: true,
        time_zone: "America/Bahia",
      }),
      resolveSession: async () => ({ identity: createIdentity(clinicBahiaId) }),
      rpc: () => vi.fn(),
      reader: () => vi.fn(),
    });

    const req = new Request("https://portal.clinicabahia.com/api/agenda/availability", {
      method: "POST",
      headers: {
        host: "portal.clinicabahia.com",
        Authorization: "Bearer valid_token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceRequestId: "55555555-5555-4555-8555-555555555555",
        interval: {
          startsAt: "2026-10-21T12:00:00Z",
          endsAt: "2026-10-21T13:00:00Z",
        },
      }),
    });

    // Sem a flag operacional, responde seguramente 503
    const res = await handlers.POST(req);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Disponibilidade temporariamente indisponível");
  });
});
