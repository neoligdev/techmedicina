import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { DomainsPage } from "../features/super-admin/domains/domains-page";
import { DomainDnsInstructions } from "../features/super-admin/domains/domain-dns-instructions";
import { DomainReservationForm } from "../features/super-admin/domains/domain-reservation-form";
import { DemoProvider } from "../features/demo/context";
import { supabase } from "../integrations/supabase/client";

const validClinicId = "00000000-0000-4000-8000-000000000001";
const otherClinicId = "00000000-0000-4000-8000-000000000002";
const testAdminToken = "jwt-valid-admin-session-token-xyz";

const mockClinics = [
  { id: validClinicId, name: "Clínica Viva Bem" },
  { id: otherClinicId, name: "Hospital Metropolitano" },
];

const mockDomain1 = {
  id: "00000000-0000-4000-8000-000000000011",
  clinic_id: validClinicId,
  hostname: "gestao.viva.com.br",
  environment: "clinic_portal" as const,
  status: "pending_verification" as const,
  revision: 1,
  created_at: "2026-10-15T10:00:00Z",
};

const mockDomain2 = {
  id: "00000000-0000-4000-8000-000000000012",
  clinic_id: validClinicId,
  hostname: "app.viva.com.br",
  environment: "patient_pwa" as const,
  status: "pending_verification" as const,
  revision: 1,
  created_at: "2026-10-16T14:30:00Z",
};

function renderPage(props: Partial<React.ComponentProps<typeof DomainsPage>> = {}) {
  return render(
    <DemoProvider>
      <DomainsPage
        clinics={mockClinics}
        initialClinicId={validClinicId}
        token={testAdminToken}
        {...props}
      />
    </DemoProvider>,
  );
}

describe("Página de Domínios White Label no Super ADM", () => {
  beforeEach(() => {
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
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renderiza a interface administrativa com cabeçalho e métricas operacionais carregadas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          domains: [mockDomain1, mockDomain2],
          hasMore: false,
          nextCursor: null,
        }),
      ),
    );

    renderPage();

    expect(screen.getByText("Domínios White Label")).toBeInTheDocument();
    expect(screen.getByText("GESTÃO DA PLATAFORMA")).toBeInTheDocument();
    expect(
      screen.getByText(/Governança de domínios personalizados, apontamentos DNS/),
    ).toBeInTheDocument();

    await screen.findByText("gestao.viva.com.br");
    expect(screen.getByText("app.viva.com.br")).toBeInTheDocument();
    expect(screen.getByText("Reservas Carregadas")).toBeInTheDocument();
  });

  it("exibe situação real do domínio com badge de verificação pendente", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          domains: [mockDomain1],
          hasMore: false,
          nextCursor: null,
        }),
      ),
    );

    renderPage();

    await screen.findByText("gestao.viva.com.br");
    const statusBadges = screen.getAllByLabelText("Status: Pendente de verificação");
    expect(statusBadges.length).toBeGreaterThan(0);
    expect(screen.getByText("Portal da Clínica e Médico")).toBeInTheDocument();
  });

  it("exibe estado seguro do transporte HTTPS/TLS sem simular aprovação fictícia", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          domains: [mockDomain1],
          hasMore: false,
          nextCursor: null,
        }),
      ),
    );

    renderPage();

    await screen.findByText("gestao.viva.com.br");
    const tlsButton = screen.getByRole("button", {
      name: `Ver status HTTPS de ${mockDomain1.hostname}`,
    });
    fireEvent.click(tlsButton);

    expect(screen.getByText("Verificação HTTPS & Certificado TLS")).toBeInTheDocument();
    expect(screen.getByText("Transporte HTTPS Pendente de Validação")).toBeInTheDocument();
    expect(screen.getByText(/A interface não declara aprovação prévia/)).toBeInTheDocument();
  });

  it("abre modal de auditoria e busca eventos do servidor via /api/platform/domain-audit", async () => {
    const auditPayload = {
      domain: mockDomain1,
      events: [
        {
          id: "00000000-0000-4000-8000-000000000003",
          domain_id: mockDomain1.id,
          actor_user_id: "00000000-0000-4000-8000-000000000099",
          action: "domain_reserved",
          occurred_at: "2026-10-15T12:00:00Z",
        },
      ],
      hasMore: false,
      nextCursor: null,
    };

    const fetcher = vi.fn().mockImplementation((url) => {
      if (String(url).includes("/api/platform/domain-audit")) {
        return Promise.resolve(Response.json(auditPayload));
      }
      return Promise.resolve(
        Response.json({
          domains: [mockDomain1],
          hasMore: false,
          nextCursor: null,
        }),
      );
    });
    vi.stubGlobal("fetch", fetcher);

    renderPage();

    await screen.findByText("gestao.viva.com.br");
    const auditButton = screen.getByRole("button", {
      name: `Ver auditoria de ${mockDomain1.hostname}`,
    });
    fireEvent.click(auditButton);

    await screen.findByText("Histórico & Auditoria de Reserva");
    await screen.findByText("Domínio Reservado com Sucesso");
    expect(screen.getByText(/00000000-0000-4000-8000-000000000099/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => {
      expect(screen.queryByText("Histórico & Auditoria de Reserva")).toBeNull();
    });
  });

  it("permite cadastrar nova reserva e exibe confirmação com verificação pendente", async () => {
    const newDomain = {
      id: "00000000-0000-4000-8000-000000000020",
      clinic_id: validClinicId,
      hostname: "paciente.viva.com.br",
      environment: "patient_pwa",
      status: "pending_verification",
      revision: 1,
      created_at: "2026-10-21T09:00:00Z",
    };

    const fetcher = vi.fn().mockImplementation((url, init) => {
      if (init?.method === "POST") {
        return Promise.resolve(Response.json({ domain: newDomain }, { status: 201 }));
      }
      return Promise.resolve(
        Response.json({
          domains: [mockDomain1],
          hasMore: false,
          nextCursor: null,
        }),
      );
    });
    vi.stubGlobal("fetch", fetcher);

    renderPage();

    await screen.findByText("gestao.viva.com.br");

    fireEvent.click(screen.getByRole("button", { name: "Nova reserva de domínio" }));
    expect(screen.getByText("Cadastrar Nova Reserva de Domínio")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Hostname da reserva"), {
      target: { value: "paciente.viva.com.br" },
    });
    fireEvent.change(screen.getByLabelText("Finalidade da reserva"), {
      target: { value: "patient_pwa" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Reservar domínio" }));

    await screen.findByText("Domínio reservado. Verificação de posse e HTTPS ainda pendentes.");

    const postCall = fetcher.mock.calls.find((call) => call[1]?.method === "POST");
    expect(postCall).toBeDefined();
    expect(JSON.parse(postCall?.[1].body)).toEqual({
      clinicId: validClinicId,
      hostname: "paciente.viva.com.br",
      environment: "patient_pwa",
    });
    expect(postCall?.[1].headers.Authorization).toBe(`Bearer ${testAdminToken}`);
  });

  it("trata erro de conflito 409 quando o hostname já estiver reservado", async () => {
    const fetcher = vi.fn().mockImplementation((_url, init) => {
      if (init?.method === "POST") {
        return Promise.resolve(Response.json({ error: "Conflito" }, { status: 409 }));
      }
      return Promise.resolve(
        Response.json({
          domains: [],
          hasMore: false,
          nextCursor: null,
        }),
      );
    });
    vi.stubGlobal("fetch", fetcher);

    renderPage();

    await screen.findByText("Nenhum domínio reservado nesta clínica");

    fireEvent.click(screen.getByRole("button", { name: "Cadastrar primeiro domínio" }));
    fireEvent.change(screen.getByLabelText("Hostname da reserva"), {
      target: { value: "duplicado.viva.com.br" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reservar domínio" }));

    await screen.findByRole("alert");
    expect(screen.getByText("Este hostname já está reservado.")).toBeInTheDocument();
  });

  // =========================================================================
  // TESTES OBRIGATÓRIOS DE SEGURANÇA E REGRESSÃO
  // =========================================================================

  it("rejeita identificador de clínica inválido e não dispara chamadas com slug fictício", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    renderPage({ initialClinicId: "slug-arbitrario-nao-uuid" });

    await screen.findByText("Nenhuma clínica autorizada selecionada");
    expect(
      screen.getByText(/Selecione uma clínica com identificador válido no menu acima/),
    ).toBeInTheDocument();

    const domainCalls = fetcher.mock.calls.filter((call) =>
      String(call[0]).includes("/api/platform/domains"),
    );
    expect(domainCalls).toHaveLength(0);
  });

  it("bloqueia operações administrativas e exibe banner quando não há sessão autenticada", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    render(
      <DemoProvider>
        <DomainsPage clinics={mockClinics} initialClinicId={validClinicId} />
      </DemoProvider>,
    );

    await screen.findByText("Sessão Administrativa Não Confirmada");
    expect(
      screen.getByText(/Para visualizar, cadastrar ou gerenciar domínios das clínicas/),
    ).toBeInTheDocument();

    const reservationBtn = screen.getByRole("button", { name: "Nova reserva de domínio" });
    expect(reservationBtn).toBeDisabled();

    expect(fetcher).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/platform/domains"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.stringContaining("fixture") }),
      }),
    );
  });

  it("trata sessão expirada (HTTP 401), anula credencial e exibe alerta de login necessário", async () => {
    const fetcher = vi.fn().mockImplementation((url) => {
      if (String(url).includes("/api/platform/domains")) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
        );
      }
      return Promise.resolve(Response.json({ domains: [] }));
    });
    vi.stubGlobal("fetch", fetcher);

    renderPage();

    await screen.findByText("Sessão administrativa expirada. Faça login novamente.");
    await screen.findByText("Sessão Administrativa Não Confirmada");
  });

  it("trata acesso negado (HTTP 403) sem simular sucesso ou mascarar proibição", async () => {
    const fetcher = vi.fn().mockImplementation((url) => {
      if (String(url).includes("/api/platform/domains")) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
        );
      }
      return Promise.resolve(Response.json({ domains: [] }));
    });
    vi.stubGlobal("fetch", fetcher);

    renderPage();

    await screen.findByText("Acesso administrativo negado. Requer papel super_admin.");
  });

  it("rejeita resposta com tentativa de associação a outro tenant (cross-tenant leak)", async () => {
    const leakedDomain = {
      ...mockDomain1,
      clinic_id: otherClinicId,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          domains: [leakedDomain],
          hasMore: false,
          nextCursor: null,
        }),
      ),
    );

    renderPage();

    await screen.findByText("Tentativa de associação a outro tenant rejeitada");
    expect(screen.queryByText("gestao.viva.com.br")).toBeNull();
  });

  it("desabilita a ação de copiar token TXT não confirmado e alerta que o desafio ainda não foi emitido", () => {
    render(<DomainDnsInstructions domain={mockDomain1} />);

    expect(screen.getByText(/Orientações Gerais/)).toBeInTheDocument();
    expect(screen.getByText(/Desafio Não Emitido/)).toBeInTheDocument();
    expect(
      screen.getByText(/O token criptográfico definitivo de 256 bits ainda não foi emitido/),
    ).toBeInTheDocument();

    const copyValueBtn = screen.getByRole("button", { name: "Copiar valor do registro DNS" });
    expect(copyValueBtn).toBeDisabled();

    const copyAllBtn = screen.getByRole("button", { name: "Copiar todas as instruções de DNS" });
    expect(copyAllBtn).toBeDisabled();

    const copyHostBtn = screen.getByRole("button", { name: "Copiar nome do registro DNS" });
    expect(copyHostBtn).not.toBeDisabled();
  });

  it("impede submissão do formulário de reserva quando ausente token ou clínica válida", () => {
    render(
      <DomainReservationForm
        clinics={mockClinics}
        selectedClinicId={validClinicId}
        token={null}
        onSuccess={vi.fn()}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: "Reservar domínio" });
    expect(submitBtn).toBeDisabled();
    expect(
      screen.getByText("Autenticação administrativa necessária para reservar domínios."),
    ).toBeInTheDocument();
  });

  it("trata erro HTTP 403 no formulário de reserva informando papel super_admin necessário", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })),
    );

    render(
      <DomainReservationForm
        clinics={mockClinics}
        selectedClinicId={validClinicId}
        token={testAdminToken}
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Hostname da reserva"), {
      target: { value: "portal.viva.com.br" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reservar domínio" }));

    await screen.findByRole("alert");
    expect(screen.getByText("Acesso administrativo não autorizado.")).toBeInTheDocument();
  });
});
