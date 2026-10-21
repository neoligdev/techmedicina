import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClinicPoliciesPanel } from "@/features/super-admin/plans/components/clinic-policies-panel";
import { CatalogComponentsView } from "@/features/super-admin/plans/components/catalog-components-view";
import { CATALOG_COMPONENTS, isValidClinicUuid } from "@/features/super-admin/plans/types";
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
});
