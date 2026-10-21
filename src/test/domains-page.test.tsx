import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DomainsPage } from "@/features/super-admin/domains";
import { DemoProvider } from "@/features/demo/context";

const clinicId = "00000000-0000-4000-8000-000000000001";
const mockClinics = [{ id: clinicId, name: "Clínica Viva Saúde" }];

const mockDomain1 = {
  id: "00000000-0000-4000-8000-000000000011",
  clinic_id: clinicId,
  hostname: "gestao.viva.com.br",
  environment: "clinic_portal",
  status: "pending_verification",
  revision: 1,
  created_at: "2026-10-15T12:00:00Z",
};
const mockDomain2 = {
  id: "00000000-0000-4000-8000-000000000012",
  clinic_id: clinicId,
  hostname: "app.viva.com.br",
  environment: "patient_pwa",
  status: "pending_verification",
  revision: 1,
  created_at: "2026-10-16T14:30:00Z",
};

function renderPage(
  ui: React.ReactElement = <DomainsPage clinics={mockClinics} initialClinicId={clinicId} />,
) {
  return render(<DemoProvider>{ui}</DemoProvider>);
}

describe("Página de Domínios White Label no Super ADM", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renderiza a interface administrativa com cabeçalho e métricas operacionais", async () => {
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

  it("exibe painel de instruções DNS TXT ao acionar a ação correspondente", async () => {
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
    const dnsButton = screen.getByRole("button", {
      name: `Ver instruções DNS de ${mockDomain1.hostname}`,
    });
    fireEvent.click(dnsButton);

    expect(screen.getByText("Instruções de Configuração DNS TXT")).toBeInTheDocument();
    expect(screen.getByText(`_plugpix-verification.${mockDomain1.hostname}`)).toBeInTheDocument();
    expect(screen.getByText(/plugpix-domain-verification=/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copiar todas as instruções de DNS" }),
    ).toBeInTheDocument();
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

    // Fechar modal
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => {
      expect(screen.queryByText("Histórico & Auditoria de Reserva")).toBeNull();
    });
  });

  it("permite cadastrar nova reserva e exibe confirmação com verificação pendente", async () => {
    const newDomain = {
      id: "00000000-0000-4000-8000-000000000020",
      clinic_id: clinicId,
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

    // Abrir formulário
    fireEvent.click(screen.getByRole("button", { name: "Nova reserva de domínio" }));
    expect(screen.getByText("Cadastrar Nova Reserva de Domínio")).toBeInTheDocument();

    // Preencher hostname
    fireEvent.change(screen.getByLabelText("Hostname da reserva"), {
      target: { value: "paciente.viva.com.br" },
    });
    fireEvent.change(screen.getByLabelText("Finalidade da reserva"), {
      target: { value: "patient_pwa" },
    });

    // Submeter
    fireEvent.click(screen.getByRole("button", { name: "Reservar domínio" }));

    await screen.findByText("Domínio reservado. Verificação de posse e HTTPS ainda pendentes.");

    const postCall = fetcher.mock.calls.find((call) => call[1]?.method === "POST");
    expect(postCall).toBeDefined();
    expect(JSON.parse(postCall?.[1].body)).toEqual({
      clinicId,
      hostname: "paciente.viva.com.br",
      environment: "patient_pwa",
    });
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
});
