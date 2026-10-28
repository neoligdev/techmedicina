// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
const { getUser, onAuthStateChange } = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser,
      onAuthStateChange,
      getSession: async () => ({ data: { session: { access_token: "qa" } } }),
    },
  },
}));
vi.mock("@/features/clinic-contracts/library", () => ({
  ClinicContractLibrary: ({
    disabled,
    onOpen,
    refreshKey,
  }: {
    disabled?: boolean;
    onOpen: (id: string) => void;
    refreshKey?: number;
  }) => (
    <button
      data-testid="contract-library"
      data-refresh={refreshKey}
      disabled={disabled}
      onClick={() => onOpen("11111111-1111-4111-8111-111111111111")}
    >
      Abrir contrato pela biblioteca QA
    </button>
  ),
}));
import {
  ClinicContractEditor,
  ClinicContractWorkspace,
} from "@/features/clinic-contracts/workspace";
const clinicId = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333",
  token = async () => "qa";
const directory = {
  clinics: [
    { id: clinicId, name: "Clínica real QA", is_active: false, created_at: "2026-10-28T10:00:00Z" },
    { id: other, name: "Segunda clínica QA", is_active: true, created_at: "2026-10-27T10:00:00Z" },
  ],
  hasMore: false,
  nextCursor: null,
};
const receipt = (input: {
  id: string;
  clinicId: string;
  document: unknown;
  expectedRevision: number;
}) => ({
  id: input.id,
  clinicId: input.clinicId,
  status: "draft",
  document: input.document,
  revision: input.expectedRevision + 1,
  createdAt: "2026-10-28T10:00:00Z",
  updatedAt: "2026-10-28T10:00:00Z",
});
async function start(fetcher: typeof fetch) {
  render(<ClinicContractEditor getAccessToken={token} fetcher={fetcher} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Carregar clínicas do servidor" }));
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Clínica do contrato" }), {
    target: { value: clinicId },
  });
  fireEvent.click(screen.getByRole("button", { name: "Novo rascunho de contrato" }));
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});
it("selects server clinic, keeps blank values undecided and saves precise cents only after receipt", async () => {
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const fetcher = vi.fn<typeof fetch>(async (url, init) =>
    String(url).includes("/clinics")
      ? Response.json(directory)
      : Response.json({ draft: receipt(JSON.parse(String(init?.body))) }),
  );
  await start(fetcher);
  expect(screen.getByRole("combobox", { name: "Clínica do contrato" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: "Setup de implementação (R$)" }), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Preço por titular (R$)" }), {
    target: { value: "12,34" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho comercial" }));
  });
  expect(screen.getByText("Rascunho comercial salvo e confirmado no servidor.")).toBeTruthy();
  expect(screen.getByTestId("contract-library").getAttribute("data-refresh")).toBe("1");
  const write = fetcher.mock.calls.find((c) => c[1]?.method === "PUT")!;
  expect(JSON.parse(String(write[1]?.body))).toMatchObject({
    clinicId,
    expectedRevision: 0,
    document: {
      setupCents: 0,
      monthlyCents: null,
      monthlyEnabled: null,
      livesEnabled: null,
      livesCount: null,
      holderCents: 1234,
      dependentCents: null,
    },
  });
  expect(storage).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /ativar|cobrar|aceitar/i })).toBeNull();
});
it("does not send invalid decimal values and preserves typed input for correction", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(directory));
  await start(fetcher);
  const setup = screen.getByRole("textbox", { name: "Setup de implementação (R$)" });
  fireEvent.change(setup, { target: { value: "1,234" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho comercial" }));
  });
  expect(screen.getByText(/Confira título, quantidades e valores/)).toBeTruthy();
  expect(setup).toHaveValue("1,234");
  expect(fetcher.mock.calls.filter((c) => c[1]?.method === "PUT")).toHaveLength(0);
});
it("uncertain save requires reread and never repeats write automatically", async () => {
  let saved: unknown;
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    if (String(url).includes("/clinics")) return Response.json(directory);
    if (init?.method === "PUT") {
      saved = receipt(JSON.parse(String(init.body)));
      throw new Error("lost receipt");
    }
    return Response.json({ draft: saved });
  });
  await start(fetcher);
  fireEvent.change(screen.getByRole("textbox", { name: "Observações comerciais" }), {
    target: { value: "Proposta QA" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho comercial" }));
  });
  expect(screen.getByRole("textbox", { name: "Nome da proposta" })).toBeDisabled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Recarregar contrato do servidor" }));
  });
  expect(screen.getByText("Versão comercial confirmada carregada.")).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Observações comerciais" })).toHaveValue(
    "Proposta QA",
  );
  expect(fetcher.mock.calls.filter((c) => c[1]?.method === "PUT")).toHaveLength(1);
});
it("switching clinic needs explicit local discard and never deletes a persisted record", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(directory));
  await start(fetcher);
  fireEvent.click(screen.getByRole("button", { name: "Descartar edição local" }));
  expect(screen.getByRole("textbox", { name: "Nome da proposta" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar descarte local" }));
  expect(screen.queryByRole("textbox", { name: "Nome da proposta" })).toBeNull();
  fireEvent.change(screen.getByRole("combobox", { name: "Clínica do contrato" }), {
    target: { value: other },
  });
  fireEvent.click(screen.getByRole("button", { name: "Novo rascunho de contrato" }));
  expect(screen.getByText(other)).toBeTruthy();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("logout unmounts commercial editor and late initial Auth lookup cannot restore it", async () => {
  let finish!: (v: unknown) => void;
  getUser.mockReturnValueOnce(
    new Promise((r) => {
      finish = r;
    }),
  );
  render(<ClinicContractWorkspace />);
  const callback = onAuthStateChange.mock.calls[0]![0];
  await act(async () => {
    callback("SIGNED_OUT", null);
    finish({ data: { user: { id: "old-user" } }, error: null });
  });
  expect(screen.queryByRole("button", { name: "Carregar clínicas do servidor" })).toBeNull();
  expect(screen.getByText(/Entre com sua conta/)).toBeTruthy();
});

it("opens a library item within selected clinic and protects unsaved changes", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    String(url).includes("/clinics")
      ? Response.json(directory)
      : Response.json({
          draft: receipt({
            id,
            clinicId,
            document: {
              title: "Contrato salvo QA",
              currency: "BRL",
              setupCents: null,
              monthlyEnabled: null,
              monthlyCents: null,
              livesEnabled: null,
              livesCount: null,
              holderCents: null,
              dependentCents: null,
              notes: "",
            },
            expectedRevision: 0,
          }),
        }),
  );
  render(<ClinicContractEditor getAccessToken={token} fetcher={fetcher} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Carregar clínicas do servidor" }));
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Clínica do contrato" }), {
    target: { value: clinicId },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Abrir contrato pela biblioteca QA" }));
  });
  expect(screen.getByRole("textbox", { name: "Nome da proposta" })).toHaveValue(
    "Contrato salvo QA",
  );
  expect(String(fetcher.mock.calls[1]![0])).toContain("clinicId=" + clinicId);
  fireEvent.change(screen.getByRole("textbox", { name: "Nome da proposta" }), {
    target: { value: "Edição preservada" },
  });
  expect(screen.getByRole("button", { name: "Abrir contrato pela biblioteca QA" })).toBeDisabled();
});

it("historical proposal does not overwrite unsaved commercial terms", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const document = {
    title: "Proposta atual",
    currency: "BRL",
    setupCents: 1000,
    monthlyEnabled: null,
    monthlyCents: null,
    livesEnabled: null,
    livesCount: null,
    holderCents: null,
    dependentCents: null,
    notes: "Notas atuais",
  };
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    const text = String(url);
    if (text.includes("/clinics")) return Response.json(directory);
    if (text.includes("/clinic-contract-versions?"))
      return Response.json({
        page: {
          draftId: id,
          clinicId,
          items: [{ revision: 1, title: "Proposta anterior", occurredAt: "2026-10-28T10:00:00Z" }],
          nextCursor: null,
        },
      });
    if (text.includes("/clinic-contract-version?"))
      return Response.json({
        version: {
          draftId: id,
          clinicId,
          revision: 1,
          document: {
            ...document,
            title: "Proposta anterior",
            setupCents: null,
            notes: "Notas históricas",
          },
          occurredAt: "2026-10-28T10:00:00Z",
        },
      });
    return Response.json({ draft: receipt({ id, clinicId, document, expectedRevision: 1 }) });
  });
  render(<ClinicContractEditor getAccessToken={token} fetcher={fetcher} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Carregar clínicas do servidor" }));
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Clínica do contrato" }), {
    target: { value: clinicId },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Abrir contrato pela biblioteca QA" }));
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Observações comerciais" }), {
    target: { value: "Nova edição não salva" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Listar versões comerciais" }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Consultar proposta — revisão 1" }));
  });
  expect(
    screen.getByRole("article", { name: "Condições históricas em rascunho" }),
  ).toHaveTextContent("Notas históricas");
  expect(screen.getByRole("textbox", { name: "Observações comerciais" })).toHaveValue(
    "Nova edição não salva",
  );
  expect(screen.getByRole("textbox", { name: "Setup de implementação (R$)" })).toHaveValue("10,00");
  expect(screen.getByRole("button", { name: "Salvar rascunho comercial" })).not.toBeDisabled();
  expect(fetcher.mock.calls.some((c) => c[1]?.method === "PUT")).toBe(false);
});
