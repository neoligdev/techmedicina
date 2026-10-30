import * as hostResolver from "@/lib/white-label/host-resolver";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));
import { HydrationReadPanel, HydrationSection } from "@/features/hydration/app-section";
import { supabase } from "@/integrations/supabase/client";
import { loadOwnHydrationHistory } from "@/features/hydration/complete-history-client";
const clinicId = "11111111-1111-4111-8111-111111111111",
  patientId = "22222222-2222-4222-8222-222222222222",
  scope = { clinicId, patientId },
  asOf = "2026-10-30T15:00:00Z";
const token = async () => "qa",
  now = () => asOf;
const record = (n: number, volumeMl = 1) => ({
  ...scope,
  id: "00000000-0000-4000-8000-" + String(n).padStart(12, "0"),
  revision: 1,
  status: "active",
  volumeMl,
  occurredAt: "2026-10-30T12:00:00Z",
});
function page(url: string, records: unknown[] = [], nextCursor: string | null = null) {
  const u = new URL(url, "https://paciente.example");
  return Response.json({
    page: {
      ...scope,
      from: u.searchParams.get("from"),
      until: u.searchParams.get("until"),
      records,
      nextCursor,
    },
  });
}
function start() {
  fireEvent.change(screen.getByRole("combobox", { name: "Fuso horário da consulta" }), {
    target: { value: "America/Bahia" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Consultar histórico" }));
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("waits for every page before rendering a total, with explicit timezone", async () => {
  let finish!: (r: Response) => void,
    lastUrl = "";
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.endsWith("/context")) return Response.json({ scope });
    if (!url.includes("after="))
      return page(
        url,
        Array.from({ length: 100 }, (_, i) => record(i + 1)),
        record(100).id,
      );
    lastUrl = url;
    return new Promise((r) => {
      finish = r;
    });
  });
  render(<HydrationReadPanel getAccessToken={token} fetcher={fetcher} now={now} />);
  expect(screen.getByRole("button", { name: "Consultar histórico" })).toBeDisabled();
  expect(fetcher).not.toHaveBeenCalled();
  start();
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
  expect(screen.queryByRole("region", { name: "Histórico de água registrada" })).toBeNull();
  expect(screen.getByText("Carregando todo o período…")).toBeInTheDocument();
  await act(async () => {
    finish(page(lastUrl, [record(101, 25)]));
  });
  expect(screen.getByText("125 mL registrados no período")).toBeInTheDocument();
  expect(lastUrl).toContain("after=");
  fireEvent.change(screen.getByRole("combobox", { name: "Período" }), {
    target: { value: "week" },
  });
  expect(screen.queryByText("125 mL registrados no período")).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("never shows partial totals after a later page fails and supports explicit retry", async () => {
  let failed = false;
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.endsWith("/context")) return Response.json({ scope });
    if (!failed && !url.includes("after="))
      return page(
        url,
        Array.from({ length: 100 }, (_, i) => record(i + 1)),
        record(100).id,
      );
    if (!failed) {
      failed = true;
      return Response.json({ error: "unavailable" }, { status: 503 });
    }
    return page(url);
  });
  render(<HydrationReadPanel getAccessToken={token} fetcher={fetcher} now={now} />);
  start();
  await screen.findByRole("alert");
  expect(screen.queryByRole("region", { name: "Histórico de água registrada" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Consultar histórico" }));
  await screen.findByText("Sem registros no período");
  expect(screen.queryByRole("alert")).toBeNull();
});
it("discards old data when session ownership changes while reading", async () => {
  let finish!: (r: Response) => void,
    lastUrl = "";
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.endsWith("/context")) return Response.json({ scope });
    lastUrl = url;
    return new Promise((r) => {
      finish = r;
    });
  });
  const view = render(<HydrationReadPanel getAccessToken={token} fetcher={fetcher} now={now} />);
  start();
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  view.unmount();
  await act(async () => {
    finish(page(lastUrl, [record(1, 999)]));
  });
  expect(screen.queryByText("999 mL registrados no período")).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("does not request real health data in local preview or validate Auth there", async () => {
  render(<HydrationSection />);
  await screen.findByText(/endereço verificado do aplicativo/);
  expect(supabase.auth.getUser).not.toHaveBeenCalled();
});
it("cancelled loaders and malformed context never proceed to records", async () => {
  const c = new AbortController();
  c.abort();
  const fetcher = vi.fn<typeof fetch>();
  await expect(
    loadOwnHydrationHistory(
      { period: "day", timeZone: "UTC", asOf },
      { getAccessToken: token, fetcher, signal: c.signal },
    ),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(Response.json({ scope: { ...scope, actor: "private" } }));
  await expect(
    loadOwnHydrationHistory(
      { period: "day", timeZone: "UTC", asOf },
      { getAccessToken: token, fetcher },
    ),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("removes an already displayed patient history on sign out", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(asOf));
  vi.spyOn(hostResolver, "isLocalOrPreviewHost").mockReturnValue(false);
  const user = {
    id: "33333333-3333-4333-8333-333333333333",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-10-30T00:00:00Z",
  };
  vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user }, error: null });
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: {
      session: {
        access_token: "qa",
        refresh_token: "qa-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user,
      },
    },
    error: null,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      return url.endsWith("/context")
        ? Response.json({ scope })
        : page(url, [{ ...record(1, 999), occurredAt: new Date().toISOString() }]);
    }),
  );
  render(<HydrationSection />);
  await screen.findByRole("button", { name: "Consultar histórico" });
  start();
  await screen.findByText("999 mL registrados no período");
  const callback = vi.mocked(supabase.auth.onAuthStateChange).mock.calls[0]![0];
  await act(async () => {
    await callback("SIGNED_OUT", null);
  });
  expect(screen.queryByText("999 mL registrados no período")).toBeNull();
  expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
});
it("integrates recording with history and hides stale totals until explicit reload", async () => {
  let saved = false;
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/context")) return Response.json({ scope });
    if (url.endsWith("/mutate")) {
      const command = JSON.parse(init!.body as string);
      saved = true;
      const snapshot = {
        ...record(1, command.document.volumeMl),
        id: command.recordId,
        occurredAt: command.document.occurredAt,
      };
      return Response.json({
        result: {
          receipt: { scope, command, record: snapshot },
          record: snapshot,
          replayed: false,
        },
      });
    }
    return page(url, saved ? [record(1, 250)] : []);
  });
  render(<HydrationReadPanel getAccessToken={token} fetcher={fetcher} now={now} />);
  start();
  await screen.findByRole("button", { name: "Registrar consumo" });
  fireEvent.change(screen.getByLabelText("Volume registrado (mL)"), { target: { value: "250" } });
  fireEvent.change(screen.getByLabelText("Data e hora com fuso (ISO)"), {
    target: { value: "2026-10-30T12:00:00Z" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Registrar consumo" }));
  await screen.findByText(/Registro confirmado/);
  expect(screen.queryByRole("region", { name: "Histórico de água registrada" })).toBeNull();
  expect(screen.getByText(/Histórico desatualizado/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Consultar histórico" }));
  expect(await screen.findByText("250 mL registrados no período")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Registrar consumo" })).toBeEnabled();
});
