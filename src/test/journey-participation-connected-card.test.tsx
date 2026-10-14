import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { JourneyParticipationConnectedCard } from "../features/journey/participation-connected-card";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const clinicId = "00000000-0000-4000-8000-000000000001",
  patientId = "00000000-0000-4000-8000-000000000002";
it("gravação com resposta perdida exige recarga e recupera revisão confirmada", async () => {
  vi.useFakeTimers();
  let persisted = { clinicId, patientId, isEnabled: false, revision: 0 };
  const fetcher = vi.fn().mockImplementation(async (_input, init: RequestInit) => {
    if (init.method === "PUT") {
      persisted = { ...persisted, isEnabled: true, revision: 1 };
      return new Promise(() => {});
    }
    return Response.json({ preference: persisted });
  });
  await act(async () => {
    render(
      <JourneyParticipationConnectedCard
        clinicId={clinicId}
        patientId={patientId}
        getAccessToken={async () => "local-test-session"}
        fetcher={fetcher}
      />,
    );
  });
  fireEvent.click(screen.getByRole("switch"));
  fireEvent.click(screen.getByRole("button", { name: "Salvar participação" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20000);
  });
  expect(screen.getByText(/Não foi possível confirmar/)).toBeInTheDocument();
  expect(screen.getByRole("switch")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Salvar participação" })).toBeDisabled();
  expect(screen.queryByText("Participação ativada.")).not.toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Recarregar participação" }));
  });
  expect(screen.getByText("Estado confirmado: participando")).toBeInTheDocument();
  expect(screen.getByRole("switch")).not.toBeDisabled();
  expect(fetcher.mock.calls.filter((call) => call[1].method === "PUT")).toHaveLength(1);
});
it("cartão conectado usa GET/PUT autenticados e exibe pausa somente após resposta", async () => {
  const readValue = { clinicId, patientId, isEnabled: true, revision: 1 };
  const fetcher = vi.fn().mockImplementation(async (_input, init: RequestInit) =>
    Response.json({
      preference:
        init.method === "GET" ? readValue : { ...readValue, isEnabled: false, revision: 2 },
    }),
  );
  render(
    <JourneyParticipationConnectedCard
      clinicId={clinicId}
      patientId={patientId}
      getAccessToken={async () => "local-test-session"}
      fetcher={fetcher}
    />,
  );
  fireEvent.click(await screen.findByRole("switch"));
  expect(screen.getByText("Estado confirmado: participando")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Salvar participação" }));
  await screen.findByText("Participação pausada. Seu histórico foi preservado.");
  const put = fetcher.mock.calls.find((call) => call[1].method === "PUT");
  expect(JSON.parse(put![1].body)).toEqual({ patientId, isEnabled: false, expectedRevision: 1 });
  expect(put![1].headers.Authorization).toBe("Bearer local-test-session");
});
it("sessão perdida no salvamento não gera requisição nem confirmação", async () => {
  const token = vi.fn().mockResolvedValueOnce("local-test-session").mockResolvedValue(null);
  const fetcher = vi
    .fn()
    .mockImplementation(async () =>
      Response.json({ preference: { clinicId, patientId, isEnabled: false, revision: 0 } }),
    );
  render(
    <JourneyParticipationConnectedCard
      clinicId={clinicId}
      patientId={patientId}
      getAccessToken={token}
      fetcher={fetcher}
    />,
  );
  fireEvent.click(await screen.findByRole("switch"));
  fireEvent.click(screen.getByRole("button", { name: "Salvar participação" }));
  await screen.findByText(/Não foi possível confirmar/);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Estado confirmado: pausado")).toBeInTheDocument();
});
