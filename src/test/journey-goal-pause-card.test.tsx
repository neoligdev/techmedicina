import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { JourneyGoalPauseCard } from "../features/journey/goal-pause-card";
import { JourneyGoalPauseConflict, type JourneyGoalView } from "../features/journey/goal-pause";
afterEach(cleanup);
it("consulta é o padrão e revogar a ação fecha a confirmação sem enviar", () => {
  const pause = vi.fn();
  const { rerender } = render(<JourneyGoalPauseCard goal={goal} pause={pause} refresh={vi.fn()} />);
  expect(screen.queryByRole("button", { name: "Suspender meta" })).not.toBeInTheDocument();
  rerender(<JourneyGoalPauseCard goal={goal} canPause pause={pause} refresh={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Suspender meta" }));
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  rerender(<JourneyGoalPauseCard goal={goal} canPause={false} pause={pause} refresh={vi.fn()} />);
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(pause).not.toHaveBeenCalled();
});
const goal: JourneyGoalView = {
  goalId: "00000000-0000-4000-8000-000000000001",
  clinicId: "00000000-0000-4000-8000-000000000002",
  patientId: "00000000-0000-4000-8000-000000000003",
  title: "Hidratação",
  status: "eligible",
  version: 1,
};
it("exige confirmação antes de enviar e mostra apenas suspensão confirmada", async () => {
  const pause = vi.fn().mockResolvedValue({
    goalId: goal.goalId,
    clinicId: goal.clinicId,
    patientId: goal.patientId,
    status: "paused",
    version: 2,
  });
  render(<JourneyGoalPauseCard goal={goal} canPause pause={pause} refresh={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Suspender meta" }));
  expect(pause).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(pause).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Suspender meta" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar suspensão" }));
  await screen.findByText("Meta suspensa. Registros anteriores preservados.");
  expect(pause).toHaveBeenCalledWith({ goalId: goal.goalId, expectedVersion: 1 });
  expect(screen.getByText("Estado confirmado: suspensa")).toBeInTheDocument();
});
it("conflito bloqueia novo envio até recarga válida", async () => {
  const pause = vi.fn().mockRejectedValue(new JourneyGoalPauseConflict());
  const refresh = vi.fn().mockResolvedValue({ ...goal, version: 2 });
  render(<JourneyGoalPauseCard goal={goal} canPause pause={pause} refresh={refresh} />);
  fireEvent.click(screen.getByRole("button", { name: "Suspender meta" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar suspensão" }));
  await screen.findByText(/mudou em outra sessão/);
  expect(screen.getByRole("button", { name: "Suspender meta" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Recarregar meta" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suspender meta" })).not.toBeDisabled(),
  );
});
it("resposta de outro paciente não confirma suspensão", async () => {
  const pause = vi.fn().mockResolvedValue({
    goalId: goal.goalId,
    clinicId: goal.clinicId,
    patientId: goal.goalId,
    status: "paused",
    version: 2,
  });
  render(<JourneyGoalPauseCard goal={goal} canPause pause={pause} refresh={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Suspender meta" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar suspensão" }));
  await screen.findByText(/Não foi possível confirmar/);
  expect(screen.getByText("Estado confirmado: ativa")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Suspender meta" })).toBeDisabled();
});
