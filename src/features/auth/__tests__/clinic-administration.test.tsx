import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClinicAdministration } from "../clinic-administration";

const id = "00000000-0000-4000-8000-000000000001";
const clinic = {
  id,
  name: "Clínica real",
  is_active: false,
  created_at: "2026-10-10T12:00:00Z",
  revision: 3,
};
const fetchMock = vi.fn();
const onSaved = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const mount = () =>
  render(<ClinicAdministration token="verified-token" clinics={[clinic]} onSaved={onSaved} />);

describe("Formulário de cadastro real", () => {
  it("cria inativa por padrão e só confirma após resposta válida", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ clinic: { ...clinic, name: "Nova clínica", revision: 1 } }, { status: 201 }),
    );
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Nova clínica" }));
    fireEvent.change(screen.getByLabelText("Nome da clínica"), {
      target: { value: "Nova clínica" },
    });
    expect(screen.getByLabelText("Clínica ativa")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Salvar clínica" }));
    await screen.findByText("Clínica criada com auditoria registrada.");
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      operation: "create",
      name: "Nova clínica",
      isActive: false,
    });
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe("Bearer verified-token");
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
  it("carrega detalhes pelo ID e usa revisão atual para editar", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ clinic }))
      .mockResolvedValueOnce(
        Response.json({ clinic: { ...clinic, name: "Atualizada", revision: 4 } }),
      );
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Editar Clínica real" }));
    await screen.findByRole("form", { name: "Editar clínica" });
    expect(fetchMock.mock.calls[0]![0]).toBe(`/api/platform/clinic?id=${id}`);
    fireEvent.change(screen.getByLabelText("Nome da clínica"), { target: { value: "Atualizada" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar clínica" }));
    await screen.findByText("Clínica atualizada com auditoria registrada.");
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toMatchObject({
      operation: "update",
      id,
      expectedRevision: 3,
    });
  });
  it("conflito não repete edição nem apresenta sucesso", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ clinic }))
      .mockResolvedValueOnce(Response.json({}, { status: 409 }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Editar Clínica real" }));
    await screen.findByRole("form", { name: "Editar clínica" });
    fireEvent.click(screen.getByRole("button", { name: "Salvar clínica" }));
    await screen.findByRole("alert");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByText(/atualizada com auditoria/)).not.toBeInTheDocument();
  });
  it("não edita clínica diferente da solicitada", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ clinic: { ...clinic, id: "00000000-0000-4000-8000-000000000002" } }),
    );
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Editar Clínica real" }));
    await screen.findByRole("alert");
    expect(screen.queryByRole("form", { name: "Editar clínica" })).not.toBeInTheDocument();
  });
  it("envio pendente impede duplicação; desmontagem invalida resposta tardia", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    );
    const view = mount();
    fireEvent.click(screen.getByRole("button", { name: "Nova clínica" }));
    fireEvent.change(screen.getByLabelText("Nome da clínica"), {
      target: { value: "Nova clínica" },
    });
    const form = screen.getByRole("form", { name: "Criar clínica" });
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const signal: AbortSignal = fetchMock.mock.calls[0]![1].signal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => finish(Response.json({ clinic }, { status: 201 })));
    expect(onSaved).not.toHaveBeenCalled();
  });
  it("falha de rede não expõe detalhes técnicos nem confirma gravação", async () => {
    fetchMock.mockRejectedValue(new Error("private backend details"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Nova clínica" }));
    fireEvent.change(screen.getByLabelText("Nome da clínica"), {
      target: { value: "Nova clínica" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar clínica" }));
    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("private backend details");
    expect(onSaved).not.toHaveBeenCalled();
  });
});
