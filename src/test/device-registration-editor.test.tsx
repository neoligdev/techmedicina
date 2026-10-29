// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));
vi.mock("@/features/devices/registration-library", () => ({
  DeviceRegistrationLibrary: ({
    disabled,
    onOpen,
    refreshKey,
  }: {
    disabled?: boolean;
    onOpen: (id: string) => void;
    refreshKey?: number;
  }) => (
    <button
      data-testid="device-library"
      data-refresh={refreshKey}
      disabled={disabled}
      onClick={() => onOpen("11111111-1111-4111-8111-111111111111")}
    >
      Abrir unidade pela biblioteca QA
    </button>
  ),
}));
import { DeviceRegistrationEditor } from "@/features/devices/registration-workspace";
const token = async () => "qa";
afterEach(cleanup);
function receipt(input: { id: string; document: unknown; expectedRevision: number }) {
  return {
    id: input.id,
    status: "draft",
    integrationAuthorized: false,
    document: input.document,
    revision: input.expectedRevision + 1,
    createdAt: "2026-10-28T10:00:00Z",
    updatedAt: "2026-10-28T10:00:00Z",
  };
}
it("saves declared metadata without granting release and escapes preview text", async () => {
  const fetcher = vi.fn<typeof fetch>(async (_url, init) =>
    Response.json({ draft: receipt(JSON.parse(String(init?.body))) }),
  );
  render(<DeviceRegistrationEditor getAccessToken={token} fetcher={fetcher} />);
  fireEvent.click(screen.getByRole("button", { name: "Novo cadastro de unidade" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Modelo informado" }), {
    target: { value: "Modelo QA não homologado" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Observações do cadastro" }), {
    target: { value: "<img src=x onerror=alert(1)>" },
  });
  expect(
    screen.getByRole("article", { name: "Prévia dos metadados informados" }).querySelector("img"),
  ).toBeNull();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" }));
  });
  expect(
    screen.getByText("Cadastro salvo e confirmado no servidor, sem liberação da integração."),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: /liberar|parear|ativar/i })).toBeNull();
  expect(screen.getByTestId("device-library").getAttribute("data-refresh")).toBe("1");
  expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body)).document.model).toBe(
    "Modelo QA não homologado",
  );
});
it("lost receipt blocks mutation until explicit read confirms same UUID", async () => {
  let stored: unknown;
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    if (init?.method === "PUT") {
      stored = receipt(JSON.parse(String(init.body)));
      throw new Error("lost");
    }
    return Response.json({ draft: stored });
  });
  render(<DeviceRegistrationEditor getAccessToken={token} fetcher={fetcher} />);
  fireEvent.click(screen.getByRole("button", { name: "Novo cadastro de unidade" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" }));
  });
  expect(screen.getByRole("textbox", { name: "Modelo informado" })).toBeDisabled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Recarregar versão do servidor" }));
  });
  expect(screen.getByRole("textbox", { name: "Modelo informado" })).not.toBeDisabled();
  expect(fetcher.mock.calls.filter((c) => c[1]?.method === "PUT")).toHaveLength(1);
});
it("a response claiming release cannot be shown as a successful registration", async () => {
  const fetcher = vi.fn<typeof fetch>(async (_url, init) =>
    Response.json({
      draft: { ...receipt(JSON.parse(String(init?.body))), integrationAuthorized: true },
    }),
  );
  render(<DeviceRegistrationEditor getAccessToken={token} fetcher={fetcher} />);
  fireEvent.click(screen.getByRole("button", { name: "Novo cadastro de unidade" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" }));
  });
  expect(
    screen.queryByText("Cadastro salvo e confirmado no servidor, sem liberação da integração."),
  ).toBeNull();
  expect(screen.getByRole("textbox", { name: "Identificação administrativa" })).toBeDisabled();
});

it("opens a listed registration and prevents changing selection while metadata is unsaved", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({
      draft: receipt({
        id,
        expectedRevision: 0,
        document: {
          title: "Unidade já salva",
          manufacturer: "",
          model: "Modelo declarado",
          claimedIdentifier: "ETIQUETA QA",
          firmwareVersion: "v1",
          lot: "",
          notes: "",
        },
      }),
    }),
  );
  render(<DeviceRegistrationEditor getAccessToken={token} fetcher={fetcher} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Abrir unidade pela biblioteca QA" }));
  });
  expect(screen.getByRole("textbox", { name: "Modelo informado" })).toHaveValue("Modelo declarado");
  fireEvent.change(screen.getByRole("textbox", { name: "Modelo informado" }), {
    target: { value: "Revisão de metadado" },
  });
  expect(screen.getByRole("button", { name: "Abrir unidade pela biblioteca QA" })).toBeDisabled();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("historical consultation preserves unsaved device metadata", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const document = {
    title: "Unidade atual",
    manufacturer: "",
    model: "Modelo atual",
    claimedIdentifier: "QA",
    firmwareVersion: "v2",
    lot: "",
    notes: "",
  };
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    String(url).includes("device-registration-version?")
      ? Response.json({
          version: {
            draftId: id,
            revision: 1,
            integrationAuthorized: false,
            document: { ...document, title: "Unidade antiga", model: "Modelo antigo" },
            occurredAt: "2026-10-28T10:00:00Z",
          },
        })
      : Response.json({ draft: receipt({ id, document, expectedRevision: 1 }) }),
  );
  render(<DeviceRegistrationEditor getAccessToken={token} fetcher={fetcher} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Abrir unidade pela biblioteca QA" }));
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Modelo informado" }), {
    target: { value: "Edição não salva" },
  });
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Consultar versão" }));
  });
  expect(
    screen.getByRole("article", { name: "Versão histórica somente leitura" }),
  ).toHaveTextContent("Modelo antigo");
  expect(screen.getByRole("textbox", { name: "Modelo informado" })).toHaveValue("Edição não salva");
  expect(fetcher.mock.calls.every((c) => c[1]?.method !== "PUT")).toBe(true);
});
