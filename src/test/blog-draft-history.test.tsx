// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BlogDraftHistory } from "@/features/blog/draft-history";
import { createBlogDraftVersionClient } from "@/features/blog/draft-version-client";
import { blogDraftDocumentSchema } from "@/features/blog/draft-contract";
const id = "11111111-1111-4111-8111-111111111111",
  token = async () => "qa";
const version = {
  draftId: id,
  revision: 1,
  document: blogDraftDocumentSchema.parse({
    title: "Texto antigo",
    body: "<img src=x onerror=alert(1)>",
  }),
  occurredAt: "2026-10-28T10:00:00Z",
};
afterEach(cleanup);
it("reads an exact revision as escaped read-only text with fresh bearer and no cache", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ version }));
  render(<BlogDraftHistory id={id} revision={2} getAccessToken={token} fetcher={fetcher} />);
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Consultar versão" }));
  });
  expect(screen.getByText("Texto antigo")).toBeTruthy();
  expect(screen.getByRole("article").querySelector("img")).toBeNull();
  expect(screen.queryByRole("button", { name: /restaurar|salvar/i })).toBeNull();
  expect(String(fetcher.mock.calls[0]![0])).toContain("revision=1");
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    headers: { Authorization: "Bearer qa" },
  });
});
it("does not show old in-flight snapshot after draft changes", async () => {
  let finish!: (r: Response) => void;
  const fetcher = vi.fn<typeof fetch>(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const view = render(
    <BlogDraftHistory id={id} revision={1} getAccessToken={token} fetcher={fetcher} />,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Consultar versão" }));
  });
  view.rerender(
    <BlogDraftHistory
      id="22222222-2222-4222-8222-222222222222"
      revision={1}
      getAccessToken={token}
      fetcher={fetcher}
    />,
  );
  await act(async () => {
    finish(Response.json({ version }));
  });
  expect(screen.queryByText("Texto antigo")).toBeNull();
});
it("distinguishes absence from failure and allows explicit retry", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({}, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ version: null }));
  render(<BlogDraftHistory id={id} revision={1} getAccessToken={token} fetcher={fetcher} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Consultar versão" }));
  });
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Versão não encontrada.")).toBeNull();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Consultar versão" }));
  });
  expect(screen.getByText("Versão não encontrada.")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});
it("rejects cross-draft or cross-revision response and avoids fetch without session", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ version }));
  await expect(createBlogDraftVersionClient(token, fetcher)({ id, revision: 2 })).rejects.toThrow(
    "Unexpected snapshot",
  );
  fetcher.mockClear();
  await expect(
    createBlogDraftVersionClient(async () => null, fetcher)({ id, revision: 1 }),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
