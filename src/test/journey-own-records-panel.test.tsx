// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { goals, history } = vi.hoisted(() => ({ goals: vi.fn(), history: vi.fn() }));
vi.mock("@/features/journey/own-goals-client", () => ({ createOwnGoalsClient: () => goals }));
vi.mock("@/features/journey/self-report-history-client", () => ({
  createOwnSelfReportHistoryClient: () => history,
}));
import { OwnJourneyRecordsPanel } from "@/features/journey/own-records-panel";
const scope = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
  getAccessToken: async () => "qa",
};
const goal = {
  id: "33333333-3333-4333-8333-333333333333",
  kind: "medication",
  status: "paused",
  cadence: "daily",
  version: 1,
  effectiveFrom: "2026-10-01T10:00:00Z",
  expiresAt: null,
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  goals.mockResolvedValue({ ...scope, goals: [goal], nextCursor: null });
  history.mockResolvedValue({ ...scope, events: [], nextCursor: null });
});
it("renders persisted states and empty history, with no clinical write or invented score", async () => {
  await act(async () => {
    render(<OwnJourneyRecordsPanel {...scope} />);
  });
  expect(screen.getByText("Medicação")).toBeTruthy();
  expect(screen.getByText("Pausada · Diária")).toBeTruthy();
  expect(screen.getByText("Nenhum autorrelato confirmado.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Registrar atividade realizada" })).toBeNull();
});
it("keeps separate pagination cursors and appends confirmed reports", async () => {
  goals.mockResolvedValueOnce({ ...scope, goals: [goal], nextCursor: goal.id });
  history.mockResolvedValueOnce({
    ...scope,
    events: [{ id: "event-1", occurredAt: "2026-10-02T10:00:00Z" }],
    nextCursor: "event-1",
  });
  await act(async () => {
    render(<OwnJourneyRecordsPanel {...scope} />);
  });
  goals.mockResolvedValueOnce({
    ...scope,
    goals: [{ ...goal, id: "next", kind: "hydration" }],
    nextCursor: null,
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Ver mais metas" }));
  });
  expect(goals).toHaveBeenLastCalledWith({ after: goal.id });
  expect(screen.getByText("Hidratação")).toBeTruthy();
  history.mockResolvedValueOnce({
    ...scope,
    events: [{ id: "event-2", occurredAt: "2026-10-03T10:00:00Z" }],
    nextCursor: null,
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Ver mais registros" }));
  });
  expect(history).toHaveBeenLastCalledWith({ before: "event-1" });
  expect(screen.getAllByText("Atividade registrada")).toHaveLength(2);
});
it("clears previous scope immediately and discards late responses after patient change", async () => {
  let resolve!: (value: unknown) => void;
  goals.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const view = render(<OwnJourneyRecordsPanel {...scope} />);
  await act(async () => {
    view.rerender(<OwnJourneyRecordsPanel {...scope} patientId="other" />);
  });
  expect(screen.getByText("Medicação")).toBeTruthy();
  await act(async () => {
    resolve({ ...scope, goals: [{ ...goal, kind: "sleep" }], nextCursor: null });
  });
  expect(screen.queryByText("Sono")).toBeNull();
});
it("handles failed read and retry without demo fallback or rendering partial previous data", async () => {
  history.mockRejectedValueOnce(new Error("denied"));
  await act(async () => {
    render(<OwnJourneyRecordsPanel {...scope} />);
  });
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Medicação")).toBeNull();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Medicação")).toBeTruthy();
});
