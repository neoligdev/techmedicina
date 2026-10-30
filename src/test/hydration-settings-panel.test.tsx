import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { HydrationSettingsPanel } from "@/features/hydration/settings-panel";
const scope = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
};
const token = async () => "qa";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("loads absent goal as blank and saves only explicit patient input without sending notifications", async () => {
  const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
    if (init?.method === "POST") {
      const command = JSON.parse(init.body as string);
      const snapshot = { ...scope, revision: 1, settings: command.settings };
      return Response.json({
        result: { ...scope, preferences: snapshot, receipt: { command, snapshot } },
      });
    }
    return Response.json({ result: { ...scope, preferences: null, receipt: null } });
  });
  render(
    <HydrationSettingsPanel
      scope={scope}
      getAccessToken={token}
      fetcher={fetcher}
      onLocked={vi.fn()}
    />,
  );
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Carregar preferências" }));
  const goal = await screen.findByLabelText("Minha meta diária informada (mL, opcional)");
  expect(goal).toHaveValue("");
  fireEvent.change(goal, { target: { value: "1200" } });
  fireEvent.change(screen.getByLabelText("Fuso dos lembretes"), {
    target: { value: "America/Bahia" },
  });
  fireEvent.click(screen.getByLabelText("Quero lembretes nos horários escolhidos"));
  fireEvent.change(screen.getByLabelText("Horários diários (HH:mm, separados por vírgula)"), {
    target: { value: "15:30, 09:00" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));
  await screen.findByText(/Preferências salvas/);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetcher.mock.calls[1]![1]!.body as string)).toMatchObject({
    expectedRevision: 0,
    settings: {
      dailyGoalMl: 1200,
      timeZone: "America/Bahia",
      remindersEnabled: true,
      reminderTimes: ["09:00", "15:30"],
    },
  });
  expect(screen.getByText(/Nenhuma notificação está agendada/)).toBeInTheDocument();
});
it("keeps uncertain settings locked and recovers only the original request", async () => {
  let original: Record<string, unknown> = {};
  let reads = 0;
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    if (init?.method === "POST") {
      original = JSON.parse(init.body as string);
      throw new Error("lost after commit");
    }
    if (String(input).includes("sourceRequestId=")) {
      reads++;
      const snapshot = { ...scope, revision: 1, settings: original["settings"] };
      return Response.json({
        result: { ...scope, preferences: snapshot, receipt: { command: original, snapshot } },
      });
    }
    return Response.json({ result: { ...scope, preferences: null, receipt: null } });
  });
  const lock = vi.fn();
  render(
    <HydrationSettingsPanel
      scope={scope}
      getAccessToken={token}
      fetcher={fetcher}
      onLocked={lock}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Carregar preferências" }));
  await screen.findByLabelText("Fuso dos lembretes");
  fireEvent.change(screen.getByLabelText("Fuso dos lembretes"), { target: { value: "UTC" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));
  await screen.findByText(/Resultado não confirmado/);
  expect(screen.getByRole("button", { name: "Salvar preferências" })).toBeDisabled();
  expect(lock).toHaveBeenLastCalledWith(true);
  fireEvent.click(screen.getByRole("button", { name: "Consultar recibo das preferências" }));
  await screen.findByText(/Preferências confirmadas pelo recibo/);
  expect(reads).toBe(1);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(lock).toHaveBeenLastCalledWith(false);
  expect(screen.getByRole("button", { name: "Salvar preferências" })).toBeEnabled();
});
it("refuses incomplete enabled schedule before save", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ result: { ...scope, preferences: null, receipt: null } }),
  );
  render(
    <HydrationSettingsPanel
      scope={scope}
      getAccessToken={token}
      fetcher={fetcher}
      onLocked={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Carregar preferências" }));
  await screen.findByLabelText("Fuso dos lembretes");
  fireEvent.change(screen.getByLabelText("Fuso dos lembretes"), { target: { value: "UTC" } });
  fireEvent.click(screen.getByLabelText("Quero lembretes nos horários escolhidos"));
  fireEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));
  await waitFor(() => expect(screen.getByText(/Confira a meta inteira/)).toBeInTheDocument());
  expect(fetcher).toHaveBeenCalledTimes(1);
});
