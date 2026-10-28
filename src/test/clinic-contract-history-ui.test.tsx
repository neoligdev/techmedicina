// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { ClinicContractHistory } from "@/features/clinic-contracts/history";
import { emptyClinicContract } from "@/features/clinic-contracts/contracts";
const id = "11111111-1111-4111-8111-111111111111",
  clinicId = "22222222-2222-4222-8222-222222222222",
  token = async () => "qa";
const item = { revision: 1, title: "Proposta histórica QA", occurredAt: "2026-10-28T10:00:00Z" };
const page = { draftId: id, clinicId, items: [item], nextCursor: null };
const version = {
  draftId: id,
  clinicId,
  revision: 1,
  document: {
    ...emptyClinicContract(),
    title: item.title,
    setupCents: 0,
    notes: "<img src=x onerror=alert(1)>",
  },
  occurredAt: item.occurredAt,
};
afterEach(cleanup);
async function choose() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Listar versões comerciais" }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Consultar proposta — revisão 1" }));
  });
}
it("lists real scoped versions and renders historical terms as escaped read-only text", async () => {
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    Response.json(String(url).includes("-versions?") ? { page } : { version }),
  );
  render(
    <ClinicContractHistory
      id={id}
      clinicId={clinicId}
      revision={2}
      getAccessToken={token}
      fetcher={fetcher}
    />,
  );
  await choose();
  const article = screen.getByRole("article", { name: "Condições históricas em rascunho" });
  expect(article).toHaveTextContent("Somente leitura");
  expect(article).toHaveTextContent("Não definido");
  expect(article).toHaveTextContent(/R\$\s*0,00/);
  expect(article.querySelector("img")).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.queryByRole("button", { name: /restaurar|salvar|aceitar/i })).toBeNull();
  expect(String(fetcher.mock.calls[0]![0])).toContain("clinicId=" + clinicId);
});
it("discards old financial snapshot when switching clinics", async () => {
  let finish!: (r: Response) => void;
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    String(url).includes("-versions?")
      ? Response.json({ page })
      : new Promise((r) => {
          finish = r;
        }),
  );
  const view = render(
    <ClinicContractHistory
      id={id}
      clinicId={clinicId}
      revision={2}
      getAccessToken={token}
      fetcher={fetcher}
    />,
  );
  await choose();
  view.rerender(
    <ClinicContractHistory
      id={id}
      clinicId="33333333-3333-4333-8333-333333333333"
      revision={2}
      getAccessToken={token}
      fetcher={fetcher}
    />,
  );
  await act(async () => {
    finish(Response.json({ version }));
  });
  expect(screen.queryByRole("article")).toBeNull();
  expect(screen.queryByRole("button", { name: "Consultar proposta — revisão 1" })).toBeNull();
});
it("does not present failure as missing historical proposal and permits explicit retry", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ page }))
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(Response.json({ version: null }));
  render(
    <ClinicContractHistory
      id={id}
      clinicId={clinicId}
      revision={2}
      getAccessToken={token}
      fetcher={fetcher}
    />,
  );
  await choose();
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Proposta histórica não encontrada.")).toBeNull();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Consultar proposta — revisão 1" }));
  });
  expect(screen.getByText("Proposta histórica não encontrada.")).toBeTruthy();
});

it("loads older commercial metadata with an exclusive scoped revision cursor", async () => {
  const first = {
    ...page,
    items: Array.from({ length: 10 }, (_, i) => ({
      ...item,
      revision: 12 - i,
      title: "Histórico " + (12 - i),
    })),
    nextCursor: 3,
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ page: first }))
    .mockResolvedValueOnce(
      Response.json({
        page: { ...page, items: [{ ...item, revision: 2 }, item], nextCursor: null },
      }),
    );
  render(
    <ClinicContractHistory
      id={id}
      clinicId={clinicId}
      revision={12}
      getAccessToken={token}
      fetcher={fetcher}
    />,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Listar versões comerciais" }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Carregar versões anteriores" }));
  });
  expect(screen.getByRole("button", { name: "Consultar proposta — revisão 1" })).toBeTruthy();
  expect(String(fetcher.mock.calls[1]![0])).toContain("before=3");
  expect(String(fetcher.mock.calls[1]![0])).toContain("clinicId=" + clinicId);
  expect(screen.queryByRole("button", { name: "Carregar versões anteriores" })).toBeNull();
});
