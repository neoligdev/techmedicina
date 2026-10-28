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
