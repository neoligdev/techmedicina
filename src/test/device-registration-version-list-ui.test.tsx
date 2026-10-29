// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DeviceRegistrationVersionList } from "@/features/devices/registration-version-list";
const id = "11111111-1111-4111-8111-111111111111",
  token = async () => "qa";
const item = (revision: number) => ({
  revision,
  title: "Título " + revision,
  occurredAt: "2026-10-28T10:00:00Z",
});
afterEach(cleanup);
it("loads on demand, pages descending and chooses a server-listed version", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({
        page: {
          draftId: id,
          items: Array.from({ length: 10 }, (_, i) => item(12 - i)),
          nextCursor: 3,
        },
      }),
    )
    .mockResolvedValueOnce(
      Response.json({ page: { draftId: id, items: [item(2), item(1)], nextCursor: null } }),
    );
  const onSelect = vi.fn();
  render(
    <DeviceRegistrationVersionList
      id={id}
      revision={12}
      getAccessToken={token}
      fetcher={fetcher}
      onSelect={onSelect}
    />,
  );
  expect(fetcher).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Listar versões salvas" }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Carregar versões anteriores" }));
  });
  expect(String(fetcher.mock.calls[1]![0])).toContain("before=3");
  fireEvent.click(screen.getByRole("button", { name: "Consultar revisão 1" }));
  expect(onSelect).toHaveBeenCalledWith(1);
  expect(screen.queryByRole("button", { name: "Carregar versões anteriores" })).toBeNull();
});
it("errors are not empty history and explicit retry can recover", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(Response.json({ page: { draftId: id, items: [], nextCursor: null } }));
  render(
    <DeviceRegistrationVersionList
      id={id}
      revision={1}
      getAccessToken={token}
      fetcher={fetcher}
      onSelect={vi.fn()}
    />,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Listar versões salvas" }));
  });
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Nenhuma versão encontrada.")).toBeNull();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Listar versões salvas" }));
  });
  expect(screen.getByText("Nenhuma versão encontrada.")).toBeTruthy();
});
it("discards a late page after switching drafts", async () => {
  let finish!: (r: Response) => void;
  const fetcher = vi.fn<typeof fetch>(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const view = render(
    <DeviceRegistrationVersionList
      id={id}
      revision={1}
      getAccessToken={token}
      fetcher={fetcher}
      onSelect={vi.fn()}
    />,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Listar versões salvas" }));
  });
  view.rerender(
    <DeviceRegistrationVersionList
      id="22222222-2222-4222-8222-222222222222"
      revision={1}
      getAccessToken={token}
      fetcher={fetcher}
      onSelect={vi.fn()}
    />,
  );
  await act(async () => {
    finish(Response.json({ page: { draftId: id, items: [item(1)], nextCursor: null } }));
  });
  expect(screen.queryByText("Título 1")).toBeNull();
});
