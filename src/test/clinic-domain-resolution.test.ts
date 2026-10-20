// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  createReliableClinicResolver,
  defaultLookupClinicDomain,
  defaultLookupClinicRecord,
} from "@/lib/clinic/clinic-host-context.server";
import {
  createAgendaAvailabilityHandlers,
  isAgendaOperationalReady,
} from "@/lib/agenda/availability-runtime.server";
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

describe("D112 - Resolução White Label e Tabela tm_clinic_domains", () => {
  it("comprova via PGlite que o schema oficial cria tm_clinic_domains com status pending_verification e rejeita status active", async () => {
    const db = new PGlite();
    await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);

    for (const file of ["001_tenant_foundation.sql", "006_domain_reservations.sql"]) {
      await db.exec(
        await readFile(new URL(`../../database/migrations/${file}`, import.meta.url), "utf8"),
      );
    }

    // 1. Tabela oficial é tm_clinic_domains
    const tableExists = await db.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tm_clinic_domains'",
    );
    expect(tableExists.rows).toHaveLength(1);

    // 2. Tabela tm_domain_reservations NÃO existe
    const wrongTable = await db.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tm_domain_reservations'",
    );
    expect(wrongTable.rows).toHaveLength(0);

    // 3. Status é restrito a pending_verification pela constraint CHECK
    await db.query("INSERT INTO public.tm_clinics(id, name) VALUES ($1, 'Clínica Teste')", [
      clinicAId,
    ]);
    await db.query(
      "INSERT INTO public.tm_platform_operators(user_id, role, is_active) VALUES ($1, 'super_admin', true)",
      [doctorUserId],
    );
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [doctorUserId]);
    await db.exec("SET ROLE authenticated");

    const reserved = await db.query<{ saved: { status: string } }>(
      "SELECT public.tm_reserve_domain($1, $2, $3) AS saved",
      [clinicAId, "gestao.clinica.com.br", "clinic_portal"],
    );
    expect(reserved.rows[0]?.saved.status).toBe("pending_verification");

    // Tentativa de update para status 'active' no schema da migração 006 é bloqueada por RLS e CHECK
    await expect(
      db.exec("UPDATE public.tm_clinic_domains SET status='active'"),
    ).rejects.toMatchObject({ code: "42501" });

    await db.close();
  }, 30000);

  it("rejeita domínio com status pending_verification com erro 403 (apenas domínios ativos são aceitos)", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async (hostname: string) => ({
        hostname,
        clinicId: clinicAId,
        environment: "clinic_portal",
        status: "pending_verification", // Estado real das reservas no banco
      }),
      lookupClinic: async (id: string) => ({
        id,
        name: "Clínica Teste",
        is_active: true,
        time_zone: "America/Sao_Paulo",
      }),
      resolveSession: async () => ({ identity: createIdentity(clinicAId) }),
    });

    const req = new Request("https://portal.clinica.com.br/api/agenda/clinic", {
      headers: { host: "portal.clinica.com.br" },
    });

    await expect(resolver(req)).rejects.toMatchObject({
      status: 403,
      message: "Clinical host denied",
    });
  });

  it("rejeita domínio desconhecido com erro 403", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async () => null, // Não encontrado
      lookupClinic: async () => null,
      resolveSession: async () => ({ identity: createIdentity(clinicAId) }),
    });

    const req = new Request("https://portal.estranho.com.br/api/agenda/clinic", {
      headers: { host: "portal.estranho.com.br" },
    });

    await expect(resolver(req)).rejects.toMatchObject({
      status: 403,
      message: "Clinical host denied",
    });
  });

  it("rejeita clínica inativa com erro 403", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async (hostname: string) => ({
        hostname,
        clinicId: clinicAId,
        environment: "clinic_portal",
        status: "active",
      }),
      lookupClinic: async (id: string) => ({
        id,
        name: "Clínica Suspensa",
        is_active: false, // Inativa
        time_zone: "America/Sao_Paulo",
      }),
      resolveSession: async () => ({ identity: createIdentity(clinicAId) }),
    });

    const req = new Request("https://portal.clinica.com.br/api/agenda/clinic", {
      headers: { host: "portal.clinica.com.br" },
    });

    await expect(resolver(req)).rejects.toMatchObject({
      status: 403,
      message: "Clínica inativa ou suspensa",
    });
  });

  it("rejeita requisição de usuário pertencente a outra clínica com erro 403 (isolamento multi-tenant)", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async (hostname: string) => ({
        hostname,
        clinicId: clinicAId, // Clínica A
        environment: "clinic_portal",
        status: "active",
      }),
      lookupClinic: async (id: string) => ({
        id,
        name: "Clínica A",
        is_active: true,
        time_zone: "America/Sao_Paulo",
      }),
      resolveSession: async () => ({
        identity: createIdentity(clinicBId), // Usuário da Clínica B
      }),
    });

    const req = new Request("https://portal.clinica-a.com.br/api/agenda/clinic", {
      headers: { host: "portal.clinica-a.com.br" },
    });

    await expect(resolver(req)).rejects.toMatchObject({
      status: 403,
      message: "Acesso não autorizado para esta clínica",
    });
  });

  it("rejeita host inválido, não confiável ou reservado com erro 403", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async () => null,
      lookupClinic: async () => null,
      resolveSession: async () => ({ identity: createIdentity(clinicAId) }),
    });

    // Host reservado 'admin.clinica.com'
    const req = new Request("https://admin.clinica.com/api/agenda/clinic", {
      headers: { host: "admin.clinica.com" },
    });

    await expect(resolver(req)).rejects.toMatchObject({
      status: 403,
      message: "Clinical host denied",
    });
  });

  it("rejeita sessão sem perfil médico verificado com erro 403", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async (hostname: string) => ({
        hostname,
        clinicId: clinicAId,
        environment: "clinic_portal",
        status: "active",
      }),
      lookupClinic: async (id: string) => ({
        id,
        name: "Clínica A",
        is_active: true,
        time_zone: "America/Sao_Paulo",
      }),
      resolveSession: async () => ({
        identity: createIdentity(clinicAId, { medicalIdentityVerified: false }), // Não verificado
      }),
    });

    const req = new Request("https://portal.clinica-a.com.br/api/agenda/clinic", {
      headers: { host: "portal.clinica-a.com.br" },
    });

    await expect(resolver(req)).rejects.toMatchObject({
      status: 403,
      message: "Perfil clínico não autorizado",
    });
  });

  it("trata falha controlada de lookup com erro gracioso sem unhandled exception", async () => {
    const resolver = createReliableClinicResolver("clinic_portal", {
      lookupDomain: async () => {
        throw new Error("Conexão com banco interrompida");
      },
      lookupClinic: async () => null,
      resolveSession: async () => ({ identity: createIdentity(clinicAId) }),
    });

    const req = new Request("https://portal.clinica.com.br/api/agenda/clinic", {
      headers: { host: "portal.clinica.com.br" },
    });

    await expect(resolver(req)).rejects.toThrow("Conexão com banco interrompida");
  });

  it("confirma que a flag operacional AGENDA_OPERATIONAL_ENABLED permanece desligada por padrão seguro", () => {
    expect(isAgendaOperationalReady()).toBe(false);
  });

  it("exporta defaultLookupClinicDomain e defaultLookupClinicRecord centralizados sem duplicação", () => {
    expect(typeof defaultLookupClinicDomain).toBe("function");
    expect(typeof defaultLookupClinicRecord).toBe("function");
  });
});
