import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { JourneyParticipationCard } from "../features/journey/participation-card";
import { JourneyParticipationConflict } from "../features/journey/participation";
afterEach(cleanup);
const clinicId = "00000000-0000-4000-8000-000000000001",
  patientId = "00000000-0000-4000-8000-000000000002";
const preference = { clinicId, patientId, isEnabled: false, revision: 1 };
it("carrega, salva com revisão e mostra somente estado confirmado", async () => {
  const read = vi.fn().mockResolvedValue(preference);
  const save = vi.fn().mockResolvedValue({ ...preference, isEnabled: true, revision: 2 });
  render(
    <JourneyParticipationCard clinicId={clinicId} patientId={patientId} read={read} save={save} />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Carregando");
  await screen.findByRole("switch");
  fireEvent.click(screen.getByRole("switch"));
  expect(screen.getByText("Estado confirmado: pausado")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Salvar participação" }));
  await screen.findByText("Participação ativada.");
  expect(save).toHaveBeenCalledWith({ patientId, isEnabled: true, expectedRevision: 1 });
  expect(screen.getByText("Estado confirmado: participando")).toBeInTheDocument();
});
it("falha de gravação não mostra ativação e permite recarregar", async () => {
  const read = vi.fn().mockResolvedValue(preference);
  const save = vi.fn().mockRejectedValue(new Error("offline"));
  render(
    <JourneyParticipationCard clinicId={clinicId} patientId={patientId} read={read} save={save} />,
  );
  fireEvent.click(await screen.findByRole("switch"));
  fireEvent.click(screen.getByRole("button", { name: "Salvar participação" }));
  await screen.findByText(/Não foi possível confirmar/);
  expect(screen.getByRole("switch")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Salvar participação" })).toBeDisabled();
  expect(screen.getByText("Estado confirmado: pausado")).toBeInTheDocument();
  expect(screen.queryByText("Participação ativada.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Recarregar participação" }));
  await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
});
it("conflito impede sobrescrita até recarga", async () => {
  const read = vi.fn().mockResolvedValue(preference);
  const save = vi.fn().mockRejectedValue(new JourneyParticipationConflict());
  render(
    <JourneyParticipationCard clinicId={clinicId} patientId={patientId} read={read} save={save} />,
  );
  fireEvent.click(await screen.findByRole("switch"));
  fireEvent.click(screen.getByRole("button", { name: "Salvar participação" }));
  await screen.findByText(/mudou em outra sessão/);
  expect(screen.getByRole("switch")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Salvar participação" })).toBeDisabled();
});
it("troca de paciente ignora leitura antiga e recusa resposta alheia", async () => {
  let finish: (value: unknown) => void = () => {};
  const read = vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const save = vi.fn();
  const { rerender } = render(
    <JourneyParticipationCard clinicId={clinicId} patientId={patientId} read={read} save={save} />,
  );
  const oldFinish = finish;
  const other = "00000000-0000-4000-8000-000000000003";
  rerender(
    <JourneyParticipationCard clinicId={clinicId} patientId={other} read={read} save={save} />,
  );
  oldFinish(preference);
  finish(preference);
  await screen.findByText(/Não foi possível carregar/);
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
});
