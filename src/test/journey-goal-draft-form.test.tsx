import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { JourneyGoalDraftForm } from "@/features/journey/goal-draft-form";
import { JourneyGoalDraftConnectedForm } from "@/features/journey/goal-draft-connected-form";
import { JourneyGoalDraftConflict } from "@/features/journey/goal-draft-client";
import type { JourneyGoalDraftInput } from "@/features/journey/goal-draft";
afterEach(cleanup);
const clinicId = "11111111-1111-4111-8111-111111111111",
  patientId = "22222222-2222-4222-8222-222222222222";
const props = { clinicId, patientId };
const receipt = (input: JourneyGoalDraftInput) => ({
  ...input,
  clinicId,
  id: "33333333-3333-4333-8333-333333333333",
  state: "draft",
  createdAt: "2026-10-14T12:00:00.000Z",
});
it("locks fields after uncertain write and resends exact proposal", async () => {
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error("lost"))
    .mockImplementationOnce(async (input) => receipt(input));
  render(<JourneyGoalDraftForm {...props} canCreate send={send} />);
  fireEvent.change(screen.getByLabelText("Área de cuidado"), { target: { value: "sleep" } });
  fireEvent.change(screen.getByLabelText("Frequência sugerida"), { target: { value: "weekly" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  await screen.findByText(/Não foi possível confirmar/);
  expect(screen.getByLabelText("Área de cuidado")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Reenviar mesma proposta" }));
  await screen.findByText(/Rascunho confirmado/);
  expect(send.mock.calls[0]?.[0]).toEqual(send.mock.calls[1]?.[0]);
  expect(send.mock.calls[0]?.[0]).toMatchObject({ patientId, kind: "sleep", cadence: "weekly" });
  expect(screen.getByRole("button")).toBeDisabled();
});
it("does not confirm another patient's receipt", async () => {
  render(
    <JourneyGoalDraftForm
      {...props}
      canCreate
      send={async (input) => ({ ...receipt(input), patientId: clinicId })}
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/Não foi possível confirmar/);
  expect(screen.queryByText(/Rascunho confirmado/)).not.toBeInTheDocument();
});
it("ignores late results after patient switch and prevents duplicate pending writes", async () => {
  let finish!: (value: unknown) => void;
  const send = vi.fn(
    (_input: JourneyGoalDraftInput) =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { rerender } = render(<JourneyGoalDraftForm {...props} canCreate send={send} />);
  fireEvent.click(screen.getByRole("button"));
  fireEvent.click(screen.getByRole("button"));
  expect(send).toHaveBeenCalledTimes(1);
  const input = send.mock.calls[0]?.[0];
  rerender(<JourneyGoalDraftForm clinicId={clinicId} patientId={clinicId} canCreate send={send} />);
  await act(async () => {
    finish(input ? receipt(input) : null);
  });
  expect(screen.queryByText(/Rascunho confirmado/)).not.toBeInTheDocument();
  expect(screen.getByRole("button")).not.toBeDisabled();
});
it("default denial and revocation block action; conflict cannot retry", async () => {
  const send = vi.fn().mockRejectedValue(new JourneyGoalDraftConflict());
  const { rerender } = render(<JourneyGoalDraftForm {...props} send={send} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  rerender(<JourneyGoalDraftForm {...props} canCreate send={send} />);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/Há um conflito/);
  expect(screen.getByRole("button")).toBeDisabled();
  rerender(<JourneyGoalDraftForm {...props} canCreate={false} send={send} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it("connected form posts proposal with authenticated transport", async () => {
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) =>
    Response.json({ draft: receipt(JSON.parse(String(init?.body))) }),
  );
  render(
    <JourneyGoalDraftConnectedForm
      {...props}
      canCreate
      getAccessToken={async () => "qa-session"}
      fetcher={fetcher}
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/Rascunho confirmado/);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/journey/goal-drafts",
    expect.objectContaining({
      method: "POST",
      headers: { Authorization: "Bearer qa-session", "Content-Type": "application/json" },
    }),
  );
});
