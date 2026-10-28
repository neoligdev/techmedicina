// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
vi.mock("@/features/blog/draft-library", () => ({
  BlogDraftLibrary: ({
    disabled,
    onOpen,
    refreshKey,
  }: {
    disabled?: boolean;
    onOpen: (id: string) => void;
    refreshKey?: number;
  }) => (
    <button
      data-testid="draft-library"
      data-refresh={refreshKey}
      disabled={disabled}
      onClick={() => onOpen("11111111-1111-4111-8111-111111111111")}
    >
      Abrir pela biblioteca QA
    </button>
  ),
}));
import { BlogDraftEditor, BlogDraftWorkspace } from "@/features/blog/draft-workspace";
import { blogDraftDocumentSchema } from "@/features/blog/draft-contract";
const token = async () => "qa";
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});
it("creates a stable draft, saves server receipt and previews text without executing markup", async () => {
  const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
    const input = JSON.parse(String(init?.body));
    return Response.json({
      draft: {
        id: input.id,
        status: "draft",
        document: input.document,
        revision: 1,
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      },
    });
  });
  render(<BlogDraftEditor getAccessToken={token} fetcher={fetcher} />);
  fireEvent.click(screen.getByRole("button", { name: "Novo rascunho" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
    target: { value: "Artigo QA" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Conteúdo em texto" }), {
    target: { value: "<img src=x onerror=alert(1)>" },
  });
  expect(
    screen.getByRole("article", { name: "Prévia textual do rascunho" }).querySelector("img"),
  ).toBeNull();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  });
  expect(screen.getByText("Rascunho salvo e confirmado no servidor.")).toBeTruthy();
  expect(screen.getByTestId("draft-library").getAttribute("data-refresh")).toBe("1");
  expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toMatchObject({
    expectedRevision: 0,
    document: { title: "Artigo QA" },
  });
  expect(screen.getByRole("button", { name: "Salvar rascunho" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Publicar" })).toBeNull();
});
it("uncertain write blocks overwrite until verified server reload", async () => {
  let persisted: unknown = null;
  const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
    if (init?.method === "PUT") {
      const input = JSON.parse(String(init.body));
      persisted = {
        id: input.id,
        status: "draft",
        document: input.document,
        revision: 1,
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      };
      throw new Error("response lost");
    }
    return Response.json({ draft: persisted });
  });
  render(<BlogDraftEditor getAccessToken={token} fetcher={fetcher} />);
  fireEvent.click(screen.getByRole("button", { name: "Novo rascunho" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  });
  expect(screen.getByRole("textbox", { name: "Título" })).toBeDisabled();
  expect(screen.queryByText("Rascunho salvo e confirmado no servidor.")).toBeNull();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Recarregar versão do servidor" }));
  });
  expect(screen.getByRole("textbox", { name: "Título" })).not.toBeDisabled();
  expect(screen.getByText("Versão confirmada carregada.")).toBeTruthy();
  expect(fetcher.mock.calls.filter((c) => c[1]?.method === "PUT")).toHaveLength(1);
});
it("logout removes unsaved editorial data and does not restore it from browser storage", async () => {
  await act(async () => {
    render(<BlogDraftWorkspace />);
  });
  fireEvent.click(screen.getByRole("button", { name: "Novo rascunho" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Conteúdo em texto" }), {
    target: { value: "Editorial em edição QA" },
  });
  const callback = onAuthStateChange.mock.calls[0]![0] as (event: string, session: null) => void;
  await act(async () => {
    callback("SIGNED_OUT", null);
  });
  expect(screen.queryByRole("textbox", { name: "Conteúdo em texto" })).toBeNull();
  expect(screen.queryByText("Editorial em edição QA")).toBeNull();
});

it("library selection opens the confirmed draft and unsaved changes block switching", async () => {
  const document = blogDraftDocumentSchema.parse({ title: "Artigo selecionado" });
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      draft: {
        id: "11111111-1111-4111-8111-111111111111",
        status: "draft",
        document,
        revision: 2,
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-02T00:00:00Z",
      },
    }),
  );
  render(<BlogDraftEditor getAccessToken={token} fetcher={fetcher} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Abrir pela biblioteca QA" }));
  });
  expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Artigo selecionado");
  fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
    target: { value: "Alteração ainda não salva" },
  });
  expect(screen.getByRole("button", { name: "Abrir pela biblioteca QA" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Abrir rascunho" })).toBeDisabled();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("historical preview leaves unsaved current editor contents intact", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const fetcher = vi.fn<typeof fetch>(async (input) =>
    String(input).includes("blog-draft-version")
      ? Response.json({
          version: {
            draftId: id,
            revision: 1,
            document: blogDraftDocumentSchema.parse({ title: "Título histórico" }),
            occurredAt: "2026-10-28T10:00:00Z",
          },
        })
      : Response.json({
          draft: {
            id,
            status: "draft",
            document: blogDraftDocumentSchema.parse({ title: "Título atual" }),
            revision: 2,
            createdAt: "2026-10-01T00:00:00Z",
            updatedAt: "2026-10-28T10:00:00Z",
          },
        }),
  );
  render(<BlogDraftEditor getAccessToken={token} fetcher={fetcher} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Abrir pela biblioteca QA" }));
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
    target: { value: "Edição não salva" },
  });
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Consultar versão" }));
  });
  expect(screen.getByText("Título histórico")).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Edição não salva");
  expect(screen.getByRole("button", { name: "Salvar rascunho" })).not.toBeDisabled();
  expect(fetcher.mock.calls.every((c) => c[1]?.method === "GET")).toBe(true);
});

it("selecting a listed version can preview a newer server revision without replacing dirty fields", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.includes("blog-draft-versions?"))
      return Response.json({
        page: {
          draftId: id,
          items: [
            { revision: 3, title: "Nova revisão no servidor", occurredAt: "2026-10-28T10:00:00Z" },
          ],
          nextCursor: null,
        },
      });
    if (url.includes("blog-draft-version?"))
      return Response.json({
        version: {
          draftId: id,
          revision: 3,
          document: blogDraftDocumentSchema.parse({
            title: "Nova revisão no servidor",
            body: "Histórico independente",
          }),
          occurredAt: "2026-10-28T10:00:00Z",
        },
      });
    return Response.json({
      draft: {
        id,
        status: "draft",
        document: blogDraftDocumentSchema.parse({ title: "Título carregado" }),
        revision: 2,
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-28T10:00:00Z",
      },
    });
  });
  render(<BlogDraftEditor getAccessToken={token} fetcher={fetcher} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Abrir pela biblioteca QA" }));
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
    target: { value: "Edição local mantida" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Listar versões salvas" }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Consultar revisão 3" }));
  });
  expect(
    screen.getByRole("article", { name: "Versão histórica somente leitura" }),
  ).toHaveTextContent("Histórico independente");
  expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Edição local mantida");
  expect(screen.getByRole("button", { name: "Salvar rascunho" })).not.toBeDisabled();
  expect(fetcher.mock.calls.every((c) => c[1]?.method === "GET")).toBe(true);
});
