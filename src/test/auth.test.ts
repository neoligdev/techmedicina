import { describe, it, expect } from "vitest";
import { isAuthorized, AuthContext, AuthenticatedIdentity, Permission } from "../lib/auth/core";

describe("Motor de Autorização - Núcleo de Políticas (Unitário)", () => {
  const createIdentity = (override?: Partial<AuthenticatedIdentity>): AuthenticatedIdentity => ({
    userId: "user-123",
    links: [],
    ...override,
  });

  const grantsMedico: Permission[] = [
    { resource: "agenda", action: "read" },
    { resource: "agenda", action: "write" },
    { resource: "paciente", action: "read" },
    { resource: "paciente", action: "write" },
    { resource: "prontuario", action: "read" },
    { resource: "prontuario", action: "create" },
    { resource: "prontuario", action: "write" },
    { resource: "prontuario", action: "delete" },
  ];

  const grantsPaciente: Permission[] = [
    { resource: "agenda", action: "read" },
    { resource: "agenda", action: "create" },
  ];

  const grantsAdmin: Permission[] = [
    { resource: "cadastro_clinica", action: "read" },
    { resource: "cadastro_clinica", action: "write" },
    { resource: "agenda", action: "read" },
    { resource: "agenda", action: "write" },
    { resource: "agenda", action: "create" },
    { resource: "agenda", action: "delete" },
    { resource: "faturamento", action: "read" },
    { resource: "faturamento", action: "write" },
    { resource: "paciente", action: "read" },
    { resource: "paciente", action: "write" },
  ];

  it("nega requisição não autenticada (sem identidade)", () => {
    const context = { identity: null as unknown as AuthenticatedIdentity };
    expect(isAuthorized(context, "cadastro_clinica", "read")).toBe(false);
  });

  it("nega tentativas de forjar identidade por contexto (vazio/incorreto sem link válido)", () => {
    const context: AuthContext = {
      identity: createIdentity({ links: [] }),
      currentClinicId: "clinic-A",
    };
    expect(isAuthorized(context, "paciente", "read", { ownerClinicId: "clinic-A" })).toBe(false);
  });

  it("nega acesso entre clínicas diferentes da permitida", () => {
    const context: AuthContext = {
      identity: createIdentity({
        links: [
          {
            clinicId: "clinic-A",
            role: "medico",
            isActive: true,
            grants: grantsMedico,
            medicalIdentityVerified: true,
          },
        ],
      }),
      currentClinicId: "clinic-B",
    };
    expect(isAuthorized(context, "paciente", "read", { ownerClinicId: "clinic-B" })).toBe(false);
  });

  it("nega acesso quando o vínculo do usuário está inativo", () => {
    const context: AuthContext = {
      identity: createIdentity({
        links: [
          {
            clinicId: "clinic-A",
            role: "medico",
            isActive: false,
            grants: grantsMedico,
            medicalIdentityVerified: true,
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };
    expect(isAuthorized(context, "paciente", "read", { ownerClinicId: "clinic-A" })).toBe(false);
  });

  it("permite acesso de paciente apenas ao PRÓPRIO registro na clínica ativa usando vínculo", () => {
    const context: AuthContext = {
      identity: createIdentity({
        userId: "auth0|paciente-777",
        links: [
          {
            clinicId: "clinic-A",
            role: "paciente",
            isActive: true,
            grants: grantsPaciente,
            patientId: "paciente-123",
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };

    const validMetadata = {
      ownerClinicId: "clinic-A",
      ownerPatientId: "paciente-123",
      patientLink: { patientId: "paciente-123", clinicId: "clinic-A", isActive: true },
    };

    const otherPatientMetadata = {
      ownerClinicId: "clinic-A",
      ownerPatientId: "outro-paciente",
      patientLink: { patientId: "outro-paciente", clinicId: "clinic-A", isActive: true },
    };

    // Ler agenda dele mesmo
    expect(isAuthorized(context, "agenda", "read", validMetadata)).toBe(true);

    // Ler agenda de outro paciente
    expect(isAuthorized(context, "agenda", "read", otherPatientMetadata)).toBe(false);

    // Ler prontuário não é permitido para paciente pois ele não tem o grant, mesmo com vínculo correto
    expect(isAuthorized(context, "prontuario", "read", validMetadata)).toBe(false);
  });

  it("permite acesso de médico em clínica A sem vazar pra clínica B (contexto restrito)", () => {
    const identity = createIdentity({
      links: [
        {
          clinicId: "clinic-A",
          role: "medico",
          isActive: true,
          grants: grantsMedico,
          medicalIdentityVerified: true,
        },
        {
          clinicId: "clinic-B",
          role: "medico",
          isActive: false,
          grants: grantsMedico,
          medicalIdentityVerified: true,
        },
      ],
    });

    const contextA: AuthContext = { identity, currentClinicId: "clinic-A" };
    expect(
      isAuthorized(contextA, "paciente", "read", {
        ownerClinicId: "clinic-A",
        ownerPatientId: "pac",
        patientLink: { patientId: "pac", clinicId: "clinic-A", isActive: true },
      }),
    ).toBe(true);

    // Tentar acessar recurso do paciente que explicitamente pertence a B
    expect(
      isAuthorized(contextA, "paciente", "read", {
        ownerClinicId: "clinic-B",
        ownerPatientId: "pac",
        patientLink: { patientId: "pac", clinicId: "clinic-B", isActive: true },
      }),
    ).toBe(false);

    const contextB: AuthContext = { identity, currentClinicId: "clinic-B" };
    expect(
      isAuthorized(contextB, "paciente", "read", {
        ownerClinicId: "clinic-B",
        ownerPatientId: "pac",
        patientLink: { patientId: "pac", clinicId: "clinic-B", isActive: true },
      }),
    ).toBe(false);
  });

  it("nega elevação administrativa para leitura de conteúdo clínico", () => {
    const context: AuthContext = {
      identity: createIdentity({
        links: [{ clinicId: "clinic-A", role: "admin", isActive: true, grants: grantsAdmin }],
      }),
      currentClinicId: "clinic-A",
    };

    const clinicalMeta = {
      ownerClinicId: "clinic-A",
      ownerPatientId: "pac",
      patientLink: { patientId: "pac", clinicId: "clinic-A", isActive: true },
    };

    // Admin não tem grant para prontuario
    expect(isAuthorized(context, "prontuario", "read", clinicalMeta)).toBe(false);

    // Admin gerencia o cadastro e agenda (se tiver grant)
    expect(isAuthorized(context, "cadastro_clinica", "read", { ownerClinicId: "clinic-A" })).toBe(
      true,
    );
    expect(isAuthorized(context, "agenda", "read", clinicalMeta)).toBe(true);
  });

  it("Super ADM tem gestão de cadastro, mas não de prontuário clínico", () => {
    const context: AuthContext = {
      identity: createIdentity({
        globalRole: "super_admin",
        links: [], // Sem vinculo na clinica
      }),
      currentClinicId: "clinic-A",
    };
    // Consegue gerenciar cadastro_clinica mesmo sem ser dono
    expect(isAuthorized(context, "cadastro_clinica", "manage")).toBe(true);

    // Não consegue ler prontuário de clínica, pois não tem contexto/metadata pra isso e globalRole não bypassa
    expect(isAuthorized(context, "prontuario", "read", { ownerClinicId: "clinic-A" })).toBe(false);
  });

  it("nega acesso a recurso de paciente sem vínculo na clínica atual", () => {
    const context: AuthContext = {
      identity: createIdentity({
        userId: "auth-1",
        links: [
          {
            clinicId: "clinic-A",
            role: "paciente",
            isActive: true,
            grants: grantsPaciente,
            patientId: "paciente-1",
          },
        ],
      }),
      currentClinicId: "clinic-B",
    };
    expect(
      isAuthorized(context, "agenda", "read", {
        ownerClinicId: "clinic-B",
        ownerPatientId: "paciente-1",
        patientLink: { patientId: "paciente-1", clinicId: "clinic-B", isActive: true },
      }),
    ).toBe(false);
  });

  it("nega ação desconhecida ou não mapeada", () => {
    const context: AuthContext = {
      identity: createIdentity({
        links: [
          {
            clinicId: "clinic-A",
            role: "medico",
            isActive: true,
            grants: grantsMedico,
            medicalIdentityVerified: true,
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };
    expect(isAuthorized(context, "paciente", "delete", { ownerClinicId: "clinic-A" })).toBe(false);
    expect(isAuthorized(context, "paciente", "manage", { ownerClinicId: "clinic-A" })).toBe(false);
  });

  it("nega alterar ou apagar prontuário definitivo, mesmo para médicos ativos", () => {
    const context: AuthContext = {
      identity: createIdentity({
        links: [
          {
            clinicId: "clinic-A",
            role: "medico",
            isActive: true,
            grants: grantsMedico,
            medicalIdentityVerified: true,
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };

    const draftMeta = {
      ownerClinicId: "clinic-A",
      ownerPatientId: "pac",
      isDraft: true,
      patientLink: { patientId: "pac", clinicId: "clinic-A", isActive: true },
    };

    const defMeta = {
      ownerClinicId: "clinic-A",
      ownerPatientId: "pac",
      isDraft: false,
      patientLink: { patientId: "pac", clinicId: "clinic-A", isActive: true },
    };

    // Rascunho permite alterar/deletar
    expect(isAuthorized(context, "prontuario", "write", draftMeta)).toBe(true);
    expect(isAuthorized(context, "prontuario", "delete", draftMeta)).toBe(true);

    // Definitivo bloqueia alterar/deletar
    expect(isAuthorized(context, "prontuario", "write", defMeta)).toBe(false);
    expect(isAuthorized(context, "prontuario", "delete", defMeta)).toBe(false);

    // Definitivo permite ler
    expect(isAuthorized(context, "prontuario", "read", defMeta)).toBe(true);
  });

  it("médico sem medicalIdentityVerified é negado em conteúdo clínico", () => {
    const context: AuthContext = {
      identity: createIdentity({
        links: [
          {
            clinicId: "clinic-A",
            role: "medico",
            isActive: true,
            grants: grantsMedico,
            medicalIdentityVerified: false,
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };

    const clinicalMeta = {
      ownerClinicId: "clinic-A",
      ownerPatientId: "pac",
      patientLink: { patientId: "pac", clinicId: "clinic-A", isActive: true },
    };

    expect(isAuthorized(context, "prontuario", "read", clinicalMeta)).toBe(false);
  });

  it("nega acesso a paciente se paciente tem grant deliberadamente amplo (adversarial)", () => {
    const context: AuthContext = {
      identity: createIdentity({
        userId: "auth-1",
        links: [
          {
            clinicId: "clinic-A",
            role: "paciente",
            isActive: true,
            grants: [{ resource: "prontuario", action: "read" }, ...grantsPaciente],
            patientId: "paciente-1",
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };

    const clinicalMeta = {
      ownerClinicId: "clinic-A",
      ownerPatientId: "paciente-1",
      patientLink: { patientId: "paciente-1", clinicId: "clinic-A", isActive: true },
    };

    // Mesmo com o grant de prontuario, o perfil de paciente DEVE ser negado em runtime
    expect(isAuthorized(context, "prontuario", "read", clinicalMeta)).toBe(false);
  });

  it("nega prontuario para admin mesmo se injetarem grant falso na base", () => {
    const context: AuthContext = {
      identity: createIdentity({
        userId: "auth-1",
        links: [
          {
            clinicId: "clinic-A",
            role: "admin",
            isActive: true,
            grants: [{ resource: "prontuario", action: "read" }, ...grantsAdmin],
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };

    const clinicalMeta = {
      ownerClinicId: "clinic-A",
      ownerPatientId: "paciente-1",
      patientLink: { patientId: "paciente-1", clinicId: "clinic-A", isActive: true },
    };

    expect(isAuthorized(context, "prontuario", "read", clinicalMeta)).toBe(false);
  });

  it("nega recursos de clinica/paciente se ownerPatientId for vazio", () => {
    const context: AuthContext = {
      identity: createIdentity({
        userId: "auth-1",
        links: [
          {
            clinicId: "clinic-A",
            role: "medico",
            isActive: true,
            grants: grantsMedico,
            medicalIdentityVerified: true,
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };

    const clinicalMeta = {
      ownerClinicId: "clinic-A",
      ownerPatientId: "",
      patientLink: { patientId: "", clinicId: "clinic-A", isActive: true },
    };

    // Ausência de ownerPatientId ou id vazio deve negar acesso
    expect(isAuthorized(context, "agenda", "read", clinicalMeta)).toBe(false);
  });

  it("nega médico acessando faturamento/cadastro mesmo com grant injetado (adversarial)", () => {
    const context: AuthContext = {
      identity: createIdentity({
        userId: "auth-1",
        links: [
          {
            clinicId: "clinic-A",
            role: "medico",
            isActive: true,
            grants: [{ resource: "faturamento", action: "read" }, ...grantsMedico],
            medicalIdentityVerified: true,
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };

    expect(isAuthorized(context, "faturamento", "read", { ownerClinicId: "clinic-A" })).toBe(false);
  });

  it("nega acesso com parâmetros desconhecidos mesmo se o grant for corrompido para permitir unknown", () => {
    const context: AuthContext = {
      identity: createIdentity({
        links: [
          {
            clinicId: "clinic-A",
            role: "admin",
            isActive: true,
            // @ts-expect-error testando unknown
            grants: [{ resource: "faturamento", action: "unknown" }, ...grantsAdmin],
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };

    // @ts-expect-error testando unknown
    expect(isAuthorized(context, "faturamento", "unknown", { ownerClinicId: "clinic-A" })).toBe(
      false,
    );
    // @ts-expect-error testando unknown
    expect(isAuthorized(context, "unknown_resource", "read", { ownerClinicId: "clinic-A" })).toBe(
      false,
    );
  });

  it("nega acesso a super_admin tentado via link de clínica, bem como papéis desconhecidos/malformed", () => {
    // 1. Link com papel "super_admin" (inválido como role de clínica)
    const contextSuperAdminLocal: AuthContext = {
      identity: createIdentity({
        globalRole: "super_admin",
        links: [
          {
            clinicId: "clinic-A",
            role: "super_admin",
            isActive: true,
            grants: [{ resource: "prontuario", action: "read" }, ...grantsMedico],
            medicalIdentityVerified: true,
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };

    const clinicalMeta = {
      ownerClinicId: "clinic-A",
      ownerPatientId: "paciente-1",
      patientLink: { patientId: "paciente-1", clinicId: "clinic-A", isActive: true },
    };

    expect(isAuthorized(contextSuperAdminLocal, "prontuario", "read", clinicalMeta)).toBe(false);

    // 2. Link com papel malformado
    const contextMalformedRole: AuthContext = {
      identity: createIdentity({
        links: [
          {
            clinicId: "clinic-A",
            // @ts-expect-error testando unknown
            role: "inventado",
            isActive: true,
            grants: [{ resource: "agenda", action: "read" }],
          },
        ],
      }),
      currentClinicId: "clinic-A",
    };

    expect(isAuthorized(contextMalformedRole, "agenda", "read", clinicalMeta)).toBe(false);
  });
});
