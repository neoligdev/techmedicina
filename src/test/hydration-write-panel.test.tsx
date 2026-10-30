import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { HydrationWritePanel } from "@/features/hydration/write-panel";
const scope = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
};
const token = async () => "qa";
const record = {
  ...scope,
  id: "33333333-3333-4333-8333-333333333333",
  revision: 2,
  status: "active" as const,
  volumeMl: 100,
  occurredAt: "2026-10-30T12:00:00Z",
};
function setup(fetcher: typeof fetch, records: (typeof record)[] = []) {
  let next = 0;
  vi.spyOn(crypto, "randomUUID").mockImplementation(
    () => `44444444-4444-4444-8444-${String(++next).padStart(12, "0")}`,
  );
  const onLocked = vi.fn(),
    onChanged = vi.fn();
  return {
    ...render(
      <HydrationWritePanel
        scope={scope}
        records={records}
        getAccessToken={token}
        fetcher={fetcher}
        onLocked={onLocked}
        onChanged={onChanged}
      />,
    ),
    onLocked,
    onChanged,
  };
}
function fill() {
  fireEvent.change(screen.getByLabelText("Volume registrado (mL)"), { target: { value: "250" } });
  fireEvent.change(screen.getByLabelText("Data e hora com fuso (ISO)"), {
    target: { value: "2026-10-30T09:00:00-03:00" },
  });
}
function accepted(command: Record<string, unknown>) {
  const snapshot = {
    ...record,
    id: command["recordId"],
    revision: Number(command["expectedRevision"]) + 1,
    status: command["kind"] === "void" ? "voided" : "active",
    ...((command["document"] as object) ?? {}),
  };
  return { receipt: { scope, command, record: snapshot }, record: snapshot, replayed: false };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("records once, disables duplicate submission and marks history stale only after confirmation", async () => {
  let finish!: (r: Response) => void;
  const fetcher = vi.fn<typeof fetch>(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { onChanged } = setup(fetcher);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Registrar consumo" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("button", { name: "Registrar consumo" })).toBeDisabled();
  expect(onChanged).not.toHaveBeenCalled();
  const command = JSON.parse(fetcher.mock.calls[0]![1]!.body as string);
  await act(async () => finish(Response.json({ result: accepted(command) })));
  expect(await screen.findByText(/Registro confirmado/)).toBeInTheDocument();
  expect(onChanged).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Registrar consumo" })).toBeDisabled();
});
it("keeps lost-response command locked, reads receipt and retries only the exact original command", async () => {
  let sent: Record<string, unknown> | undefined;
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    if (String(input).includes("/receipt?"))
      return Response.json({ result: { ...scope, record: null, receipt: null } });
    sent = JSON.parse(init!.body as string);
    throw new Error("response lost");
  });
  const { onChanged } = setup(fetcher);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Registrar consumo" }));
  await screen.findByText(/Resultado não confirmado/);
  const original = structuredClone(sent);
  expect(screen.getByLabelText("Volume registrado (mL)")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Consultar recibo original" }));
  await screen.findByText(/Recibo ainda não encontrado/);
  expect(onChanged).not.toHaveBeenCalled();
  expect(fetcher).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "Repetir solicitação original" }));
  await screen.findByText(/Resultado não confirmado/);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(sent).toEqual(original);
});
it("recovers a committed receipt without sending a second mutation", async () => {
  let command: Record<string, unknown> = {};
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    if (String(input).includes("/receipt?"))
      return Response.json({ result: { ...scope, ...accepted(command), replayed: undefined } });
    command = JSON.parse(init!.body as string);
    throw new Error("response lost");
  });
  const { onChanged } = setup(fetcher);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Registrar consumo" }));
  await screen.findByText(/Resultado não confirmado/);
  fireEvent.click(screen.getByRole("button", { name: "Consultar recibo original" }));
  await screen.findByText(/Recibo confirmado/);
  expect(onChanged).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("uses selected revision for correction and requires explicit confirmation for void", async () => {
  const commands: Record<string, unknown>[] = [];
  const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
    const command = JSON.parse(init!.body as string);
    commands.push(command);
    return Response.json({ result: accepted(command) });
  });
  setup(fetcher, [record]);
  fireEvent.change(screen.getByLabelText("Registro"), { target: { value: record.id } });
  expect(screen.getByRole("button", { name: "Anular registro" })).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText("Confirmo anular este registro, preservando suas revisões"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Anular registro" }));
  await screen.findByText(/Registro confirmado/);
  expect(commands[0]).toMatchObject({ kind: "void", recordId: record.id, expectedRevision: 2 });
  expect(commands[0]).not.toHaveProperty("document");
});
it("rejects invalid input before fetch and ignores results after unmount", async () => {
  let finish!: (r: Response) => void;
  const fetcher = vi.fn<typeof fetch>(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { unmount, onChanged } = setup(fetcher);
  fireEvent.click(screen.getByRole("button", { name: "Registrar consumo" }));
  await screen.findByText(/Informe volume inteiro/);
  expect(fetcher).not.toHaveBeenCalled();
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Registrar consumo" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  const command = JSON.parse(fetcher.mock.calls[0]![1]!.body as string);
  unmount();
  await act(async () => finish(Response.json({ result: accepted(command) })));
  expect(onChanged).not.toHaveBeenCalled();
});
it("saves a correction with optimistic revision and without inventing a new record", async () => {
  const fetcher = vi.fn<typeof fetch>(async (_input, init) =>
    Response.json({ result: accepted(JSON.parse(init!.body as string)) }),
  );
  setup(fetcher, [record]);
  fireEvent.change(screen.getByLabelText("Registro"), { target: { value: record.id } });
  fireEvent.change(screen.getByLabelText("Volume registrado (mL)"), { target: { value: "125" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar correção" }));
  await screen.findByText(/Registro confirmado/);
  expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject({
    kind: "correct",
    recordId: record.id,
    expectedRevision: 2,
    document: { volumeMl: 125, occurredAt: record.occurredAt },
  });
});
