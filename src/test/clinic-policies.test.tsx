import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClinicPoliciesPanel } from "@/features/super-admin/plans/components/clinic-policies-panel";
import { CatalogComponentsView } from "@/features/super-admin/plans/components/catalog-components-view";
import {
  CATALOG_COMPONENTS,
  isValidClinicUuid,
  REFERENCE_PACKAGES,
  DEFAULT_CLINIC_POLICY,
  SPECIALTIES_GOVERNANCE_NOTE,
} from "@/features/super-admin/plans/types";
import { supabase } from "@/integrations/supabase/client";

const validClinicId = "c3924f7e-7517-48f8-8422-b2586da285f2";
const testAdminToken = "jwt-admin-token-test-123";

describe("Gestão de Políticas Comerciais e Limites por Clínica (Super ADM)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: {
        session: {
          access_token: testAdminToken,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: 1893456000,
          refresh_token: "refresh-token",
          user: {
            id: "00000000-0000-4000-8000-000000000099",
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: "2026-10-15T10:00:00Z",
          },
        },
      },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
  });

  it("validador estrito de UUID rejeita slugs e identificadores arbitrários", () => {
    expect(isValidClinicUuid(validClinicId)).toBe(true);
    expect(isValidClinicUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
    expect(isValidClinicUuid("clinica-demo")).toBe(false);
    expect(isValidClinicUuid("default")).toBe(false);
    expect(isValidClinicUuid("12345")).toBe(false);
    expect(isValidClinicUuid("")).toBe(false);
  });

  it("exibe aviso e desabilita salvamento quando não há sessão administrativa ativa", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    render(
      <ClinicPoliciesPanel
        clinics={[{ id: validClinicId, name: "Clínica Vida e Saúde", subdomain: "vidasaude" }]}
        initialClinicId={validClinicId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Sessão Administrativa Não Confirmada/i)).toBeInTheDocument();
    });

    // Como há alterações não salvas ou sem sessão, o botão Salvar Alterações deve estar desabilitado
    const maxLivesInput = screen.getByLabelText(/Teto de Vidas/i);
    fireEvent.change(maxLivesInput, { target: { value: "4000" } });

    const saveBtn = screen.getByRole("button", { name: /Salvar Alterações/i });
    expect(saveBtn).toBeDisabled();
  });

  it("trata erro ao carregar clínicas da API de forma explícita", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });

    render(<ClinicPoliciesPanel token={testAdminToken} />);

    await waitFor(() => {
      expect(screen.getByText(/Falha ao buscar clínicas: HTTP 403/i)).toBeInTheDocument();
    });
  });

  it("carrega clínicas reais e exibe métricas de quotas e componentes oficiais", async () => {
    render(
      <ClinicPoliciesPanel
        token={testAdminToken}
        clinics={[{ id: validClinicId, name: "Clínica Aliança Médica", subdomain: "alianca" }]}
        initialClinicId={validClinicId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Clínica Aliança Médica/i)).toBeInTheDocument();
    });

    // Quotas padrão
    expect(screen.getByText("Vidas / Clientes Ativos")).toBeInTheDocument();
    expect(screen.getByText("Médicos Vinculados")).toBeInTheDocument();
    expect(screen.getByText("Situação Comercial")).toBeInTheDocument();

    // Componentes do PRD
    expect(screen.getByText("TM-2 — Telemedicina Básica")).toBeInTheDocument();
    expect(screen.getByText("TM-4 — Especialidades & Multidisciplinar")).toBeInTheDocument();
    expect(screen.getByText("Pulseira Inteligente (HW-PULSE)")).toBeInTheDocument();
  });

  it("detecta alterações e exibe confirmação antes de salvar", async () => {
    render(
      <ClinicPoliciesPanel
        token={testAdminToken}
        clinics={[{ id: validClinicId, name: "Clínica Teste", subdomain: "teste" }]}
        initialClinicId={validClinicId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Clínica Teste/i)).toBeInTheDocument();
    });

    // Altera o teto de vidas
    const maxLivesInput = screen.getByLabelText(/Teto de Vidas/i);
    fireEvent.change(maxLivesInput, { target: { value: "3500" } });

    // Verifica se badge de alterações pendentes aparece
    expect(screen.getByText("Alterações Pendentes")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /Salvar Alterações/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    // Diálogo de confirmação sensível
    expect(screen.getByText("Confirmar Atualização de Políticas")).toBeInTheDocument();
    expect(screen.getByText(/Esta ação impactará os limites operacionais/i)).toBeInTheDocument();

    // Confirma
    const confirmBtn = screen.getByRole("button", { name: "Confirmar e Aplicar" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/Políticas da clínica atualizadas localmente/i)).toBeInTheDocument();
    });
  });

  it("exibe aviso transparente de persistência quando endpoint de backend está pendente", async () => {
    render(
      <ClinicPoliciesPanel
        token={testAdminToken}
        clinics={[{ id: validClinicId, name: "Clínica Teste", subdomain: "teste" }]}
        initialClinicId={validClinicId}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Persistência em Nuvem Pendente de Migração do Codex/i),
      ).toBeInTheDocument();
    });
  });
});

describe("Catálogo Oficial de Componentes Base (PRD v0.11.3)", () => {
  it("renderiza todos os 9 componentes oficiais do PRD", () => {
    render(<CatalogComponentsView />);

    expect(screen.getByText(/Catálogo.*Componentes/i)).toBeInTheDocument();
    expect(CATALOG_COMPONENTS.length).toBe(9);

    // Verifica presença de códigos de componentes
    expect(screen.getByText("TM-2")).toBeInTheDocument();
    expect(screen.getByText("TM-3")).toBeInTheDocument();
    expect(screen.getByText("TM-4")).toBeInTheDocument();
    expect(screen.getByText("HW-PULSE")).toBeInTheDocument();
    expect(screen.getByText("HW-SCALE")).toBeInTheDocument();
    expect(screen.getByText("HW-RING")).toBeInTheDocument();
    expect(screen.getByText("AI-CARE")).toBeInTheDocument();
    expect(screen.getByText("PROTOCOL")).toBeInTheDocument();
    expect(screen.getByText("SUPPLEMENT")).toBeInTheDocument();
  });

  it("permite filtrar componentes por categoria", () => {
    render(<CatalogComponentsView />);

    // Filtra por Dispositivos (Hardware)
    const hardwareBtn = screen.getByRole("button", { name: /Dispositivos/i });
    fireEvent.click(hardwareBtn);

    // Componentes de hardware devem estar visíveis
    expect(screen.getByText("HW-PULSE")).toBeInTheDocument();
    expect(screen.getByText("HW-SCALE")).toBeInTheDocument();
    expect(screen.getByText("HW-RING")).toBeInTheDocument();

    // Componente de telemedicina TM-2 não deve aparecer na aba de hardware
    expect(screen.queryByText("TM-2")).not.toBeInTheDocument();
  });

  it("permite busca em tempo real por termo no catálogo", () => {
    render(<CatalogComponentsView />);

    const searchInput = screen.getByLabelText(/Campo de busca no catálogo/i);
    fireEvent.change(searchInput, { target: { value: "HW-SCALE" } });

    // Apenas Balança deve permanecer visível
    expect(screen.getByText("HW-SCALE")).toBeInTheDocument();
    expect(screen.queryByText("TM-2")).not.toBeInTheDocument();
    expect(screen.queryByText("AI-CARE")).not.toBeInTheDocument();

    // Limpa a busca
    const clearBtn = screen.getByLabelText(/Limpar termo de busca/i);
    fireEvent.click(clearBtn);

    expect(screen.getByText("TM-2")).toBeInTheDocument();
    expect(screen.getByText("AI-CARE")).toBeInTheDocument();
  });

  it("abre modal com detalhamento completo e três camadas comerciais", async () => {
    render(<CatalogComponentsView />);

    const detailButtons = screen.getAllByRole("button", { name: /Detalhar Componente/i });
    expect(detailButtons[0]).toBeDefined();
    fireEvent.click(detailButtons[0]!);

    await waitFor(() => {
      expect(
        screen.getByText(/Governança em Três Camadas \(PRD Seção 13.4\)/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Contrato PlugPix↔Clínica/i)).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole("button", { name: "Fechar" });
    fireEvent.click(closeBtn);
  });

  it("alterna para planos de referência e detalha modelo central", async () => {
    render(<CatalogComponentsView />);

    const packagesBtn = screen.getByRole("button", { name: /Planos de Referência/i });
    fireEvent.click(packagesBtn);

    expect(screen.getByText("Plano Essencial Vida (2.0)")).toBeInTheDocument();
    expect(screen.getByText("Plano Integral Especialidades (3.0)")).toBeInTheDocument();
    expect(screen.getByText("Plano Prime Concierge & Longevidade (4.0)")).toBeInTheDocument();

    const detailModelBtns = screen.getAllByRole("button", { name: /Detalhes do Modelo/i });
    expect(detailModelBtns[0]).toBeDefined();
    fireEvent.click(detailModelBtns[0]!);

    await waitFor(() => {
      expect(screen.getByText(/Componentes Centrais Habilitados/i)).toBeInTheDocument();
      expect(screen.getByText(/Parâmetros Comerciais de Referência/i)).toBeInTheDocument();
    });
  });
});

describe("Contratos da Clínica e Gestão de Especialidades (Super ADM)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: {
        session: {
          access_token: testAdminToken,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: 1893456000,
          refresh_token: "refresh-token",
          user: {
            id: "00000000-0000-4000-8000-000000000099",
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: "2026-10-15T10:00:00Z",
          },
        },
      },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
  });

  it("exibe termos contratuais da Camada 1 PlugPix ↔ Clínica", async () => {
    render(
      <ClinicPoliciesPanel
        token={testAdminToken}
        clinics={[{ id: validClinicId, name: "Clínica Vida Real", subdomain: "vidareal" }]}
        initialClinicId={validClinicId}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Contrato de Uso da Plataforma \(PlugPix ↔ Clínica\)/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Setup de Implementação:/i)).toBeInTheDocument();
    expect(screen.getByText(/Mensalidade da Plataforma:/i)).toBeInTheDocument();
    expect(screen.getByText(/Custo por Vida Titular:/i)).toBeInTheDocument();
    expect(screen.getByText(/Custo por Dependente:/i)).toBeInTheDocument();
  });

  it("permite adicionar e remover especialidades médicas autorizadas", async () => {
    render(
      <ClinicPoliciesPanel
        token={testAdminToken}
        clinics={[{ id: validClinicId, name: "Clínica Vida Real", subdomain: "vidareal" }]}
        initialClinicId={validClinicId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Especialidades Autorizadas")).toBeInTheDocument();
    });

    // Especialidade inicial
    expect(screen.getByText("Cardiologia")).toBeInTheDocument();

    // Remove Cardiologia
    const removeCardioBtn = screen.getByLabelText(/Remover especialidade Cardiologia/i);
    fireEvent.click(removeCardioBtn);
    expect(screen.queryByLabelText(/Remover especialidade Cardiologia/i)).not.toBeInTheDocument();

    // Adiciona Neurologia
    const selectSpec = screen.getByLabelText(/Selecionar especialidade para adicionar/i);
    fireEvent.change(selectSpec, { target: { value: "Neurologia" } });

    const addBtn = screen.getByRole("button", { name: /Adicionar/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Neurologia")).toBeInTheDocument();
  });

  it("exibe badge de Quota Excedida quando uso supera o teto de vidas", async () => {
    render(
      <ClinicPoliciesPanel
        token={testAdminToken}
        clinics={[{ id: validClinicId, name: "Clínica Vida Real", subdomain: "vidareal" }]}
        initialClinicId={validClinicId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Teto de Vidas/i)).toBeInTheDocument();
    });

    // Diminui teto para 200 (uso atual é 320)
    const maxLivesInput = screen.getByLabelText(/Teto de Vidas/i);
    fireEvent.change(maxLivesInput, { target: { value: "200" } });

    expect(screen.getByText("Quota Excedida")).toBeInTheDocument();
  });
});

describe("Auditoria Comercial e Contratual Pré-Integração (PRD v0.11.3)", () => {
  it("garante desvinculação de preços arbitrários nos modelos de referência e políticas padrão", () => {
    // Modelos de referência não podem exibir valores fixos em Reais como se fossem preços oficiais
    for (const pkg of REFERENCE_PACKAGES) {
      expect(pkg.pricingModel.setupFeeEstimated).toBeNull();
      expect(pkg.pricingModel.monthlyBaseFee).toBeNull();
      expect(pkg.pricingModel.perLifeFee).toBeNull();
      expect(pkg.pricingModel.pricingNote).toContain("Valores sob consulta");
    }

    // Política padrão da clínica deve inicializar tarifas nulas para negociação individual
    const defaultPol = DEFAULT_CLINIC_POLICY(validClinicId);
    expect(defaultPol.contractTerms!.setupFee).toBeNull();
    expect(defaultPol.contractTerms!.monthlyFee).toBeNull();
    expect(defaultPol.contractTerms!.pricePerHolderLife).toBeNull();
    expect(defaultPol.contractTerms!.pricePerDependentLife).toBeNull();
  });

  it("garante nota oficial de governança das especialidades com pendência de validação", () => {
    expect(SPECIALTIES_GOVERNANCE_NOTE).toContain("32 especialidades médicas agendadas");
    expect(SPECIALTIES_GOVERNANCE_NOTE).toContain("Nutrição, Psicologia e Educador Físico");
    expect(SPECIALTIES_GOVERNANCE_NOTE).toContain("35 especialidades");
    expect(SPECIALTIES_GOVERNANCE_NOTE).toContain("sob validação pendente");
  });

  it("audita componente HW-PULSE com referência ao H59/H59MAX e conformidade BLE", () => {
    const pulseComponent = CATALOG_COMPONENTS.find((c) => c.code === "HW-PULSE");
    expect(pulseComponent).toBeDefined();
    expect(pulseComponent?.name).toContain("H59 / H59MAX");
    expect(pulseComponent?.notes).toContain("H59/H59MAX");
    expect(pulseComponent?.notes).toContain("BLE/GATT");
    expect(pulseComponent?.notes).toContain("Nenhum dispositivo é de inclusão obrigatória");
  });

  it("renderiza badges de métrica demonstrativa e governança no painel do Super ADM", async () => {
    render(
      <ClinicPoliciesPanel
        token={testAdminToken}
        clinics={[{ id: validClinicId, name: "Clínica Auditada", subdomain: "auditada" }]}
        initialClinicId={validClinicId}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Clínica Auditada/i)).toBeInTheDocument();
    });

    // Badges de métricas demonstrativas
    const demoBadges = screen.getAllByText("Métrica Demonstrativa");
    expect(demoBadges.length).toBeGreaterThanOrEqual(2);

    // Nota de governança com ressalva comercial e pendência de validação de escopo
    expect(screen.getByText(/Pendência de Validação de Escopo/i)).toBeInTheDocument();

    // Valores não configurados aparecem como "A definir em contrato"
    const unconfiguredTerms = screen.getAllByText("A definir em contrato");
    expect(unconfiguredTerms.length).toBeGreaterThanOrEqual(4);
  });
});
