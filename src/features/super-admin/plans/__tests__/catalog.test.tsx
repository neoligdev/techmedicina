import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlansCatalog } from "../index";
import { getPlans, savePlans, backupAndClearPlans } from "../storage";
import { PlanBase } from "../types";

vi.mock("../storage", () => ({
  getPlans: vi.fn(),
  savePlans: vi.fn(),
  backupAndClearPlans: vi.fn(),
}));

describe("PlansCatalog RTL (C005-R1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "crypto", {
      value: {
        randomUUID: () => "test-uuid-1234",
      },
      configurable: true,
    });
  });

  it("exibe alerta e bloqueia criação quando recoveryNeeded é true", () => {
    vi.mocked(getPlans).mockReturnValue({
      plans: [],
      error: "Arquivo corrompido.",
      recoveryNeeded: true,
      rawContent: "invalid_data",
    });

    render(<PlansCatalog />);

    expect(screen.getByText("Erro de Persistência")).toBeInTheDocument();
    expect(screen.getByText("Arquivo corrompido.")).toBeInTheDocument();
    expect(screen.getByText("Confirmar Recuperação e Criar Backup")).toBeInTheDocument();

    const createBtn = screen.getByRole("button", { name: /Criar Telemedicina/i });
    expect(createBtn).toBeDisabled();
  }, 15000);

  it("exibe alerta, bloqueia botões e permite tentar novamente quando readFailed é true", () => {
    vi.mocked(getPlans).mockReturnValue({
      plans: [],
      error: "Falha crítica de acesso aos dados do navegador. Tente novamente.",
      recoveryNeeded: false,
      readFailed: true,
    });

    render(<PlansCatalog />);

    expect(screen.getByText("Erro de Persistência")).toBeInTheDocument();
    expect(
      screen.getByText("Falha crítica de acesso aos dados do navegador. Tente novamente."),
    ).toBeInTheDocument();
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();

    const createBtn = screen.getByRole("button", { name: /Criar Telemedicina/i });
    expect(createBtn).toBeDisabled();

    // Testa se o botão tentar novamente chama getPlans novamente
    vi.mocked(getPlans).mockReturnValueOnce({ plans: [], recoveryNeeded: false });
    fireEvent.click(screen.getByText("Tentar novamente"));
    expect(getPlans).toHaveBeenCalledTimes(2);
  }, 15000);

  it("exibe warning de legacy active mas permite ações (migração sem perda de dados inválidos)", () => {
    vi.mocked(getPlans).mockReturnValue({
      plans: [
        {
          id: "1",
          name: "Valid",
          type: "bracelet",
          status: "draft",
          createdAt: "2024",
        } as PlanBase,
      ],
      warning: "Alguns planos possuíam o status legado 'Ativo' e foram migrados...",
      recoveryNeeded: false,
    });

    render(<PlansCatalog />);

    expect(screen.getByText("Atenção")).toBeInTheDocument();
    expect(screen.getByText(/status legado 'Ativo'/)).toBeInTheDocument();

    const createBtn = screen.getByRole("button", { name: /Criar Telemedicina/i });
    expect(createBtn).not.toBeDisabled();
  }, 15000);

  it("permite recuperar acesso quando recoveryNeeded é true e aciona backupAndClearPlans preservando válidos", () => {
    const validPlans = [
      { id: "val", type: "bracelet", name: "Valido", status: "draft" } as PlanBase,
    ];
    vi.mocked(getPlans).mockReturnValue({
      plans: validPlans,
      error: "Arquivo corrompido.",
      recoveryNeeded: true,
      rawContent: "invalid_data",
    });
    vi.mocked(backupAndClearPlans).mockReturnValue({ success: true, backupKey: "backup_123" });

    render(<PlansCatalog />);

    const recoverBtn = screen.getByText("Confirmar Recuperação e Criar Backup");
    fireEvent.click(recoverBtn);

    expect(backupAndClearPlans).toHaveBeenCalledWith("invalid_data", validPlans);
    expect(screen.queryByText("Confirmar Recuperação e Criar Backup")).not.toBeInTheDocument();
    expect(screen.getByText(/Recuperação concluída/i)).toBeInTheDocument();
    expect(screen.getByText(/backup_123/i)).toBeInTheDocument();
  }, 15000);

  it("preserva o editor (não fecha) e exibe erro quando savePlans falha (setItem error ou duplicate)", () => {
    vi.mocked(getPlans).mockReturnValue({ plans: [], recoveryNeeded: false });
    vi.mocked(savePlans).mockReturnValue({ success: false, error: "Quota exceeded" });

    render(<PlansCatalog />);

    const createBtn = screen.getByRole("button", { name: /Criar Telemedicina/i });
    fireEvent.click(createBtn);

    expect(screen.getByText("Identificação")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /Salvar Rascunho/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText("Identificação")).toBeInTheDocument();
    expect(screen.getByText(/Quota exceeded/)).toBeInTheDocument();
  }, 15000);
});
