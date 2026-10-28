// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BlogDraftLibrary } from "@/features/blog/draft-library";
const token = async () => "qa";
const id = (i: number) => "00000000-0000-4000-8000-" + i.toString(16).padStart(12, "0");
const item = (i: number) => ({
  id: id(i),
  status: "draft",
  title: "Artigo " + i,
  category: "",
  revision: 1,
  updatedAt: "2026-10-01T10:00:00Z",
});
afterEach(cleanup);
it("pages through metadata and opens a draft from the library without entering UUID", async () => {
  const onOpen = vi.fn();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({
        page: {
          query: "",
          items: Array.from({ length: 25 }, (_, i) => item(i + 1)),
          nextCursor: id(25),
        },
      }),
    )
    .mockResolvedValueOnce(
      Response.json({ page: { query: "", items: [item(26)], nextCursor: null } }),
    );
  await act(async () => {
    render(<BlogDraftLibrary getAccessToken={token} fetcher={fetcher} onOpen={onOpen} />);
  });
  fireEvent.click(screen.getByRole("button", { name: "Abrir Artigo 1" }));
  expect(onOpen).toHaveBeenCalledWith(id(1));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Carregar mais rascunhos" }));
  });
  expect(screen.getByRole("button", { name: "Abrir Artigo 26" })).toBeTruthy();
  expect(String(fetcher.mock.calls[1]![0])).toContain("after=" + id(25));
});
it("new search resets page and cursor, and dirty/uncertain editor disables opening", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ page: { query: "", items: [item(1)], nextCursor: null } }),
    )
    .mockResolvedValueOnce(
      Response.json({ page: { query: "literal%", items: [], nextCursor: null } }),
    );
  await act(async () => {
    render(<BlogDraftLibrary getAccessToken={token} fetcher={fetcher} disabled onOpen={vi.fn()} />);
  });
  expect(screen.getByRole("button", { name: "Abrir Artigo 1" })).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: "Buscar por título" }), {
    target: { value: "literal%" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Pesquisar rascunhos" }));
  });
  expect(screen.getByText("Nenhum rascunho encontrado.")).toBeTruthy();
  expect(String(fetcher.mock.calls[1]![0])).not.toContain("after=");
});
it("discards old response when scope/read client changes", async () => {
  const oldToken = async () => "old",
    newToken = async () => "new";
  let finish!: (r: Response) => void;
  const oldFetch = vi.fn<typeof fetch>(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const fresh = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ page: { query: "", items: [item(2)], nextCursor: null } }));
  const view = render(
    <BlogDraftLibrary getAccessToken={oldToken} fetcher={oldFetch} onOpen={vi.fn()} />,
  );
  await act(async () => {});
  await act(async () => {
    view.rerender(<BlogDraftLibrary getAccessToken={newToken} fetcher={fresh} onOpen={vi.fn()} />);
  });
  await act(async () => {
    finish(Response.json({ page: { query: "", items: [item(1)], nextCursor: null } }));
  });
  expect(screen.queryByRole("button", { name: "Abrir Artigo 1" })).toBeNull();
  expect(screen.getByRole("button", { name: "Abrir Artigo 2" })).toBeTruthy();
});

it("failed library read stays explicit and retry can load confirmed empty result", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ page: { query: "", items: [], nextCursor: null } }));
  await act(async () => {
    render(<BlogDraftLibrary getAccessToken={token} fetcher={fetcher} onOpen={vi.fn()} />);
  });
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Nenhum rascunho encontrado.")).toBeNull();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Recarregar biblioteca" }));
  });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Nenhum rascunho encontrado.")).toBeTruthy();
});
