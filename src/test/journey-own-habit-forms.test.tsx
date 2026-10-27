// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { access, send, recover } = vi.hoisted(() => ({
  access: vi.fn(),
  send: vi.fn(),
  recover: vi.fn(),
}));
vi.mock("@/features/journey/self-report-access-client", () => ({
  createSelfReportAccessClient: () => access,
}));
vi.mock("@/features/journey/self-report-client", async (original) => ({
  ...(await original<typeof import("@/features/journey/self-report-client")>()),
  createJourneySelfReportClient: () => send,
}));
vi.mock("@/features/journey/self-report-recovery-client", () => ({
  createSelfReportRecoveryClient: () => recover,
}));
import { OwnHabitForms } from "@/features/journey/own-habit-forms";
const goal = {
  id: "33333333-3333-4333-8333-333333333333",
  kind: "hydration" as const,
  status: "eligible" as const,
  cadence: "daily" as const,
  version: 1,
  effectiveFrom: "2020-01-01T00:00:00Z",
  expiresAt: null,
};
const props = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
  goals: [goal],
  getAccessToken: async () => "qa",
  onConfirmed: vi.fn(),
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  access.mockResolvedValue({ canSubmit: true });
  send.mockImplementation(async (input) => ({
    ...input,
    id: goal.id,
    clinicId: props.clinicId,
    patientId: props.patientId,
  }));
});
it("requires explicit confirmation, keeps same event/time after uncertain response and notifies history once", async () => {
  await act(async () => {
    render(<OwnHabitForms {...props} />);
  });
  const button = screen.getByRole("button", { name: "Registrar atividade realizada" });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  send.mockRejectedValueOnce(new Error("response lost"));
  await act(async () => {
    fireEvent.click(button);
  });
  const first = send.mock.calls[0]![0];
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Reenviar mesmo registro" }));
  });
  expect(send.mock.calls[1]![0]).toEqual(first);
  expect(first.sourceEventId).toMatch(/^[a-f0-9-]{36}$/);
  expect(props.onConfirmed).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Registro confirmado.")).toBeTruthy();
});
it("rechecks grant/participation immediately before write", async () => {
  await act(async () => {
    render(<OwnHabitForms {...props} />);
  });
  fireEvent.click(screen.getByRole("checkbox"));
  access.mockResolvedValueOnce({ canSubmit: false });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Registrar atividade realizada" }));
  });
  expect(send).not.toHaveBeenCalled();
  expect(props.onConfirmed).not.toHaveBeenCalled();
});
it("never renders generic forms for medication, protocols or paused goals, and blocks expired goals", async () => {
  await act(async () => {
    render(
      <OwnHabitForms
        {...props}
        goals={[
          { ...goal, kind: "medication" },
          { ...goal, id: "other", kind: "protocol" },
          { ...goal, id: "paused", status: "paused" },
          { ...goal, id: "expired", expiresAt: "2021-01-01T00:00:00Z" },
        ]}
      />,
    );
  });
  expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  expect(
    (screen.getByRole("button", { name: "Registrar atividade realizada" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByText("Meta fora do período de vigência.")).toBeTruthy();
});
it("discards a successful late write after unmount instead of refreshing another patient", async () => {
  let finish!: (value: unknown) => void;
  send.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const view = render(<OwnHabitForms {...props} />);
  await act(async () => {});
  fireEvent.click(screen.getByRole("checkbox"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Registrar atividade realizada" }));
  });
  const input = send.mock.calls[0]![0];
  view.unmount();
  await act(async () => {
    finish({ ...input });
  });
  expect(props.onConfirmed).not.toHaveBeenCalled();
});
it("blocks during participation mutation and revalidates automatically without losing uncertain report ID", async () => {
  const view = render(<OwnHabitForms {...props} />);
  await act(async () => {});
  fireEvent.click(screen.getByRole("checkbox"));
  send.mockRejectedValueOnce(new Error("lost response"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Registrar atividade realizada" }));
  });
  const first = send.mock.calls[0]![0];
  await act(async () => {
    view.rerender(<OwnHabitForms {...props} blocked />);
  });
  expect(
    (screen.getByRole("button", { name: "Reenviar mesmo registro" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  access.mockResolvedValueOnce({ canSubmit: false });
  await act(async () => {
    view.rerender(<OwnHabitForms {...props} accessRevision={1} />);
  });
  expect(
    (screen.getByRole("button", { name: "Reenviar mesmo registro" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  access.mockResolvedValue({ canSubmit: true });
  await act(async () => {
    view.rerender(<OwnHabitForms {...props} accessRevision={2} />);
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Reenviar mesmo registro" }));
  });
  expect(send.mock.calls[1]![0]).toEqual(first);
  expect(props.onConfirmed).toHaveBeenCalledTimes(1);
});

it("confirms a previously committed event from history even after participation was paused", async () => {
  const view = render(<OwnHabitForms {...props} />);
  await act(async () => {});
  fireEvent.click(screen.getByRole("checkbox"));
  send.mockRejectedValueOnce(new Error("response lost"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Registrar atividade realizada" }));
  });
  const input = send.mock.calls[0]![0];
  access.mockResolvedValue({ canSubmit: false });
  await act(async () => {
    view.rerender(<OwnHabitForms {...props} accessRevision={1} />);
  });
  recover.mockResolvedValueOnce({
    ...input,
    id: goal.id,
    clinicId: props.clinicId,
    patientId: props.patientId,
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Conferir no histórico" }));
  });
  expect(recover).toHaveBeenCalledWith(input);
  expect(send).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Registro confirmado.")).toBeTruthy();
  expect(props.onConfirmed).toHaveBeenCalledTimes(1);
});
it("absence from bounded history never reports a failed write as confirmed", async () => {
  await act(async () => {
    render(<OwnHabitForms {...props} />);
  });
  fireEvent.click(screen.getByRole("checkbox"));
  send.mockRejectedValueOnce(new Error("lost"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Registrar atividade realizada" }));
  });
  recover.mockResolvedValueOnce(null);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Conferir no histórico" }));
  });
  expect(screen.queryByText("Registro confirmado.")).toBeNull();
  expect(props.onConfirmed).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Reenviar mesmo registro" })).toBeTruthy();
});
