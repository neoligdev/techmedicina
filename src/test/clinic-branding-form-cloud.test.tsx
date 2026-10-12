import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { DemoProvider } from "@/features/demo/context";
import { PersonalizationPage } from "@/components/platform/personalization-page";

const clinicAId = "00000000-0000-4000-8000-000000000001";
const clinicBId = "00000000-0000-4000-8000-000000000002";

const mockGetSession = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

function renderPage(clinicId: string) {
  return render(
    <DemoProvider>
      <PersonalizationPage clinicId={clinicId} />
    </DemoProvider>,
  );
}

describe("Conexão do formulário de personalização ao Lovable Cloud (/api/platform/branding)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "mock-valid-cloud-token",
          user: { id: "user-super-admin" },
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("carrega personalização existente da nuvem via GET quando clinicId é UUID", async () => {
    const cloudBrandingA = {
      clinic_id: clinicAId,
      preferences: {
        name: "Hospital São Lucas Cloud",
        primary: "#123456",
        secondary: "#654321",
        mode: "dark",
        textureId: "texture-2",
        textureUrl: "/textures/texture-2.jpg",
      },
      revision: 5,
      updated_at: "2026-10-12T10:00:00Z",
    };

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes(`/api/platform/branding?clinicId=${clinicAId}`)) {
        return Promise.resolve(Response.json({ branding: cloudBrandingA }, { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage(clinicAId);

    // Deve carregar o nome e cores vindos da nuvem
    await waitFor(() => {
      const input = screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" });
      expect(input).toHaveValue("Hospital São Lucas Cloud");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/platform/branding?clinicId=${clinicAId}`,
      expect.objectContaining({
        headers: { Authorization: "Bearer mock-valid-cloud-token" },
        cache: "no-store",
      }),
    );
    expect(localStorage.length).toBe(0);
  });

  it("não salva na demo quando a gravação Cloud falha na rede", async () => {
    const branding = {
      clinic_id: clinicAId,
      revision: 1,
      updated_at: "2026-10-12T10:00:00Z",
      preferences: { name: "Nome Cloud", primary: "#123456", secondary: "#abcdef", mode: "dark" },
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((_url, init) =>
          init?.method === "PUT"
            ? Promise.reject(new Error("offline"))
            : Promise.resolve(Response.json({ branding })),
        ),
    );
    renderPage(clinicAId);
    await waitFor(() =>
      expect(
        screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      ).toHaveValue("Nome Cloud"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Gravação não confirmada"),
    );
    expect(localStorage.length).toBe(0);
  });

  it("salva na nuvem via PUT enviando Bearer token e expectedRevision", async () => {
    let cloudRevision = 2;
    const initialCloudData = {
      clinic_id: clinicAId,
      preferences: {
        name: "Clínica Original",
        primary: "#111111",
        secondary: "#222222",
        mode: "light",
        textureId: "texture-3",
        textureUrl: "/textures/texture-3.jpg",
      },
      revision: cloudRevision,
      updated_at: "2026-10-12T10:00:00Z",
    };

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method?.toUpperCase() || "GET";
      if (url.includes(`/api/platform/branding?clinicId=${clinicAId}`)) {
        if (method === "GET") {
          return Promise.resolve(Response.json({ branding: initialCloudData }, { status: 200 }));
        }
        if (method === "PUT") {
          const body = JSON.parse(init?.body as string);
          cloudRevision++;
          return Promise.resolve(
            Response.json(
              {
                branding: {
                  clinic_id: clinicAId,
                  preferences: body.preferences,
                  revision: cloudRevision,
                  updated_at: "2026-10-12T10:05:00Z",
                },
              },
              { status: 200 },
            ),
          );
        }
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage(clinicAId);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      ).toHaveValue("Clínica Original");
    });

    // Modifica nome
    fireEvent.change(
      screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      { target: { value: "Clínica Renovada Nuvem" } },
    );

    // Salva
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Personalização salva na nuvem.");
    });

    // Verifica que o PUT foi chamado com a revisão esperada
    const putCall = fetchMock.mock.calls.find(
      (call) => (call[1] as RequestInit | undefined)?.method === "PUT",
    );
    expect(putCall).toBeDefined();
    expect(putCall![0]).toBe(`/api/platform/branding?clinicId=${clinicAId}`);
    expect((putCall![1] as RequestInit).headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer mock-valid-cloud-token",
        "Content-Type": "application/json",
      }),
    );
    expect(JSON.parse((putCall![1] as RequestInit).body as string)).toEqual({
      clinicId: clinicAId,
      expectedRevision: 2,
      preferences: expect.objectContaining({
        name: "Clínica Renovada Nuvem",
      }),
    });
  });

  it("trata conflito de concorrência (409) entre dispositivos e permite recarregar a versão mais recente", async () => {
    let getAttempts = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method?.toUpperCase() || "GET";
      if (url.includes(`/api/platform/branding?clinicId=${clinicAId}`)) {
        if (method === "GET") {
          getAttempts++;
          const name =
            getAttempts === 1 ? "Versão Inicial Dispositivo A" : "Versão Alterada no Dispositivo B";
          return Promise.resolve(
            Response.json(
              {
                branding: {
                  clinic_id: clinicAId,
                  preferences: {
                    name,
                    primary: "#111111",
                    secondary: "#222222",
                    mode: "light",
                    textureId: "texture-1",
                    textureUrl: "/textures/texture-1.jpg",
                  },
                  revision: getAttempts === 1 ? 1 : 2,
                  updated_at: "2026-10-12T10:00:00Z",
                },
              },
              { status: 200 },
            ),
          );
        }
        if (method === "PUT") {
          // Outro dispositivo salvou antes! Responde 409
          return Promise.resolve(
            Response.json(
              { error: "A personalização mudou. Recarregue antes de salvar." },
              { status: 409 },
            ),
          );
        }
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    renderPage(clinicAId);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      ).toHaveValue("Versão Inicial Dispositivo A");
    });

    fireEvent.change(
      screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      { target: { value: "Tentativa Concorrente" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    // Deve exibir erro de concorrência amigável
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "A personalização desta clínica foi alterada em outro dispositivo. Recarregue antes de salvar.",
      );
    });

    // Deve exibir o botão de recarga da nuvem
    const reloadButton = screen.getByRole("button", { name: "Recarregar versão da nuvem" });
    expect(reloadButton).toBeInTheDocument();

    // Clica para recarregar
    fireEvent.click(reloadButton);

    // Deve obter a versão que o Dispositivo B gravou
    await waitFor(() => {
      expect(
        screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      ).toHaveValue("Versão Alterada no Dispositivo B");
    });
  });

  it("garante isolamento multi-tenant entre Clínica A e Clínica B", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes(`clinicId=${clinicAId}`)) {
        return Promise.resolve(
          Response.json(
            {
              branding: {
                clinic_id: clinicAId,
                preferences: {
                  name: "Clínica Alpha",
                  primary: "#111111",
                  secondary: "#aaaaaa",
                  mode: "dark",
                  textureId: "texture-1",
                  textureUrl: "/textures/texture-1.jpg",
                },
                revision: 1,
                updated_at: "2026-10-12T10:00:00Z",
              },
            },
            { status: 200 },
          ),
        );
      }
      if (url.includes(`clinicId=${clinicBId}`)) {
        return Promise.resolve(
          Response.json(
            {
              branding: {
                clinic_id: clinicBId,
                preferences: {
                  name: "Clínica Beta",
                  primary: "#222222",
                  secondary: "#bbbbbb",
                  mode: "light",
                  textureId: "texture-4",
                  textureUrl: "/textures/texture-4.jpg",
                },
                revision: 1,
                updated_at: "2026-10-12T10:00:00Z",
              },
            },
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    // Monta Clínica A
    const viewA = renderPage(clinicAId);
    await waitFor(() => {
      expect(
        screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      ).toHaveValue("Clínica Alpha");
    });
    viewA.unmount();

    // Monta Clínica B
    renderPage(clinicBId);
    await waitFor(() => {
      expect(
        screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      ).toHaveValue("Clínica Beta");
    });
    // Não deve conter nada da Clínica A
    expect(
      screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
    ).not.toHaveValue("Clínica Alpha");
  });

  it("faz fallback para localStorage quando não é UUID (modo demo com 'clinica-viva')", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderPage("clinica-viva");

    fireEvent.change(
      screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      { target: { value: "Modo Demo Local" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Personalização e fundo salvos neste navegador. Sincronização com pacientes em outros dispositivos ainda pendente.",
      );
    });

    // Não deve ter disparado fetch para o backend Cloud
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
