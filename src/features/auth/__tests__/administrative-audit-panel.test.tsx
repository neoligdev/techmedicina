import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdministrativeAuditPanel } from "../administrative-audit-panel";
const fetchMock = vi.fn();
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Painel de auditoria", () => {
  it("consulta eventos anteriores pelo cursor e mantém página em falha", async () => {
    const event = {
      id,
      actor_user_id: id,
      clinic_id: id,
      action: "clinic_created",
      changed_fields: ["name"],
      occurred_at: "2026-10-10T12:00:00Z",
    };
    const cursor = { before: event.occurred_at, beforeId: id };
    fetchMock
      .mockResolvedValueOnce(Response.json({ events: [event], hasMore: true, nextCursor: cursor }))
      .mockResolvedValueOnce(Response.json({}, { status: 503 }));
    render(<AdministrativeAuditPanel token="verified-token" />);
    fireEvent.click(screen.getByRole("button", { name: "Consultar auditoria" }));
    fireEvent.click(await screen.findByRole("button", { name: "Eventos anteriores" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Clínica criada")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1]![0]).toBe("/api/platform/audit?" + new URLSearchParams(cursor));
    expect(fetchMock.mock.calls[1]![1].headers.Authorization).toBe("Bearer verified-token");
  });
  it("consulta somente por ação explícita e diferencia banco vazio", async () => {
    fetchMock.mockResolvedValue(Response.json({ events: [], hasMore: false }));
    render(<AdministrativeAuditPanel token="verified-token" />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Consultar auditoria" }));
    await screen.findByText("Nenhum evento administrativo registrado.");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/platform/audit",
      expect.objectContaining({
        headers: { Authorization: "Bearer verified-token" },
        cache: "no-store",
      }),
    );
  });
  it("apresenta ator real, clínica, campos e horário local", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        events: [
          {
            id,
            actor_user_id: id,
            clinic_id: id,
            action: "clinic_created",
            changed_fields: ["name"],
            occurred_at: "2026-10-10T12:00:00Z",
          },
        ],
        hasMore: false,
      }),
    );
    render(<AdministrativeAuditPanel token="verified-token" />);
    fireEvent.click(screen.getByRole("button", { name: "Consultar auditoria" }));
    await screen.findByText("Clínica criada");
    expect(screen.getByText(`Conta autora: ${id}`)).toBeInTheDocument();
    expect(screen.getByText("Campos: nome")).toBeInTheDocument();
  });
  it("não confunde acesso negado com ausência de eventos", async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 403 }));
    render(<AdministrativeAuditPanel token="verified-token" />);
    fireEvent.click(screen.getByRole("button", { name: "Consultar auditoria" }));
    await screen.findByRole("alert");
    expect(screen.queryByText("Nenhum evento administrativo registrado.")).not.toBeInTheDocument();
  });
  it("desmontagem aborta consulta e resposta tardia não é apresentada", async () => {
    let finish!: (value: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    );
    const view = render(<AdministrativeAuditPanel token="verified-token" />);
    fireEvent.click(screen.getByRole("button", { name: "Consultar auditoria" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const signal: AbortSignal = fetchMock.mock.calls[0]![1].signal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => finish(Response.json({ events: [], hasMore: false })));
    expect(screen.queryByText("Nenhum evento administrativo registrado.")).not.toBeInTheDocument();
  });
});
