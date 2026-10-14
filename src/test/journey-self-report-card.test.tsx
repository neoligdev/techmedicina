import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { JourneySelfReportCard } from "../features/journey/self-report-card";
import { JourneySelfReportConflict } from "../features/journey/self-report-client";
import { JourneySelfReportConnectedCard } from "../features/journey/self-report-connected-card";
afterEach(cleanup);
it("resposta atrasada não confirma tela de outro paciente", async () => {
  let finish!: (value: unknown) => void;
  const send = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { rerender } = render(<JourneySelfReportCard {...props} canReport send={send} />);
  fireEvent.click(screen.getByRole("button"));
  rerender(<JourneySelfReportCard {...props} patientId={clinicId} canReport send={send} />);
  await act(async () => {
    finish(receipt);
  });
  expect(screen.queryByText("Registro confirmado.")).not.toBeInTheDocument();
  expect(screen.getByRole("button")).not.toBeDisabled();
});
it("cartão conectado usa transporte autenticado sem anúncio antecipado", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ receipt }));
  render(
    <JourneySelfReportConnectedCard
      {...props}
      canReport
      getAccessToken={async () => "local-test-session"}
      fetcher={fetcher}
    />,
  );
  expect(screen.queryByText("Registro confirmado.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText("Registro confirmado.");
  expect(fetcher).toHaveBeenCalledWith(
    "/api/journey/self-report",
    expect.objectContaining({
      headers: { Authorization: "Bearer local-test-session", "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
});
const clinicId = "00000000-0000-4000-8000-000000000001",
  patientId = "00000000-0000-4000-8000-000000000002",
  id = "00000000-0000-4000-8000-000000000003";
const input = { goalId: id, sourceEventId: id, occurredAt: "2026-10-13T00:00:00Z" };
const props = { clinicId, patientId, title: "Hidratação", input };
const receipt = { id, clinicId, patientId, ...input };
it("resposta perdida mantém evento original e só recibo confirma", async () => {
  const send = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(receipt);
  render(<JourneySelfReportCard {...props} canReport send={send} />);
  fireEvent.click(screen.getByRole("button", { name: "Registrar atividade realizada" }));
  await screen.findByText(/Não foi possível confirmar/);
  fireEvent.click(screen.getByRole("button", { name: "Reenviar mesmo registro" }));
  await screen.findByText("Registro confirmado.");
  expect(send).toHaveBeenNthCalledWith(1, input);
  expect(send).toHaveBeenNthCalledWith(2, input);
  expect(screen.getByRole("button")).toBeDisabled();
});
it("conflito bloqueia reenvio e contexto sem permissão não oferece ação", async () => {
  const send = vi.fn().mockRejectedValue(new JourneySelfReportConflict());
  const { rerender } = render(<JourneySelfReportCard {...props} send={send} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  rerender(<JourneySelfReportCard {...props} canReport send={send} />);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/Há um conflito/);
  expect(screen.getByRole("button")).toBeDisabled();
});
it("resposta de outro paciente não anuncia confirmação", async () => {
  render(
    <JourneySelfReportCard
      {...props}
      canReport
      send={async () => ({ ...receipt, patientId: clinicId })}
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/Não foi possível confirmar/);
  expect(screen.queryByText("Registro confirmado.")).not.toBeInTheDocument();
});
