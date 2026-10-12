import { afterEach, it, expect, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DomainAdministration } from "../features/auth/domain-administration";
const id = "00000000-0000-4000-8000-000000000001";
const clinics = [{ id, name: "QA", is_active: false, created_at: "2026-10-12T12:00:00Z" }];
it("sugere gestão e PWA sem reservar automaticamente nem alterar domínio próprio", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(Response.json({ domains: [], hasMore: false, nextCursor: null }));
  vi.stubGlobal("fetch", fetcher);
  render(<DomainAdministration token="fixture" clinics={clinics} />);
  await screen.findByText("Nenhum domínio reservado nesta clínica.");
  fireEvent.change(screen.getByLabelText("Identificador para sugestão de domínio"), {
    target: { value: "viva-saude" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sugerir hostname" }));
  expect(screen.getByLabelText("Hostname da reserva")).toHaveValue(
    "viva-saude.techmedicina.com.br",
  );
  fireEvent.change(screen.getByLabelText("Finalidade da reserva"), {
    target: { value: "patient_pwa" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sugerir hostname" }));
  expect(screen.getByLabelText("Hostname da reserva")).toHaveValue(
    "app.viva-saude.techmedicina.com.br",
  );
  fireEvent.change(screen.getByLabelText("Hostname da reserva"), {
    target: { value: "app.clinica-propria.test" },
  });
  fireEvent.change(screen.getByLabelText("Identificador para sugestão de domínio"), {
    target: { value: "admin" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sugerir hostname" }));
  expect(screen.getByRole("alert")).toHaveTextContent("sem nome reservado");
  expect(screen.getByLabelText("Hostname da reserva")).toHaveValue("app.clinica-propria.test");
  expect(fetcher.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
});
it("percorre reservas além de cem e retorna à primeira página", async () => {
  const domains = Array.from({ length: 100 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    clinic_id: id,
    hostname: `d${String(index).padStart(3, "0")}.qa.test`,
    environment: "clinic_portal",
    status: "pending_verification",
    revision: 1,
    created_at: "2026-10-12T12:00:00Z",
  }));
  const fetcher = vi.fn().mockImplementation((url) =>
    Promise.resolve(
      Response.json(
        String(url).includes("after=")
          ? {
              domains: [{ ...domains[0], hostname: "d100.qa.test" }],
              hasMore: false,
              nextCursor: null,
            }
          : { domains, hasMore: true, nextCursor: domains.at(-1)?.hostname },
      ),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  render(<DomainAdministration token="fixture" clinics={clinics} />);
  fireEvent.click(await screen.findByRole("button", { name: "Próxima página de reservas" }));
  await screen.findByText(/d100.qa.test/);
  expect(fetcher).toHaveBeenLastCalledWith(
    expect.stringContaining(`clinicId=${id}&after=d099.qa.test`),
    expect.any(Object),
  );
  expect(screen.queryByText(/d000.qa.test/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Primeira página de reservas" }));
  await screen.findByText(/d000.qa.test/);
  expect(screen.queryByText(/d100.qa.test/)).toBeNull();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("encerra reserva sem resposta e exige recarga antes de outro envio", async () => {
  const fetcher = vi.fn().mockImplementation((_url, init) => {
    if (init?.method !== "POST")
      return Promise.resolve(Response.json({ domains: [], hasMore: false, nextCursor: null }));
    return new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      );
    });
  });
  vi.stubGlobal("fetch", fetcher);
  render(<DomainAdministration token="fixture" clinics={clinics} />);
  await screen.findByText("Nenhum domínio reservado nesta clínica.");
  vi.useFakeTimers();
  fireEvent.change(screen.getByLabelText("Hostname da reserva"), {
    target: { value: "gestao.qa.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Reservar domínio" }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20_000);
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Reserva não confirmada");
  expect(screen.getByRole("button", { name: "Reservar domínio" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Recarregar reservas" })).toBeEnabled();
  expect(
    screen.queryByText("Domínio reservado. Verificação de posse e HTTPS ainda pendentes."),
  ).toBeNull();
});
it("reserva sem exibir domínio como ativo nem criar link público", async () => {
  const domain = {
    id,
    clinic_id: id,
    hostname: "gestao.qa.test",
    environment: "clinic_portal",
    status: "pending_verification",
    revision: 1,
    created_at: "2026-10-12T12:00:00Z",
  };
  const fetcher = vi.fn().mockImplementation((_url, init) =>
    Promise.resolve(
      Response.json(
        init?.method === "POST" ? { domain } : { domains: [], hasMore: false, nextCursor: null },
        {
          status: init?.method === "POST" ? 201 : 200,
        },
      ),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  render(<DomainAdministration token="fixture" clinics={clinics} />);
  await screen.findByText("Nenhum domínio reservado nesta clínica.");
  fireEvent.change(screen.getByLabelText("Hostname da reserva"), {
    target: { value: domain.hostname },
  });
  fireEvent.click(screen.getByRole("button", { name: "Reservar domínio" }));
  await screen.findByText("Domínio reservado. Verificação de posse e HTTPS ainda pendentes.");
  expect(screen.queryByRole("link")).toBeNull();
  const call = fetcher.mock.calls.find((call) => call[1]?.method === "POST");
  expect(JSON.parse(call?.[1].body)).toEqual({
    clinicId: id,
    hostname: domain.hostname,
    environment: "clinic_portal",
  });
});
it("não habilita gravação em falha de carregamento", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ error: "unavailable" }, { status: 503 })),
  );
  render(<DomainAdministration token="fixture" clinics={clinics} />);
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Reservar domínio" })).toBeDisabled();
});
it("rejeita lista de outra clínica sem mostrar hostname alheio", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        domains: [
          {
            id,
            clinic_id: "00000000-0000-4000-8000-000000000002",
            hostname: "outro.qa.test",
            environment: "patient_pwa",
            status: "pending_verification",
            revision: 1,
            created_at: "2026-10-12T12:00:00Z",
          },
        ],
        hasMore: false,
        nextCursor: null,
      }),
    ),
  );
  render(<DomainAdministration token="fixture" clinics={clinics} />);
  await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  expect(screen.queryByText(/outro.qa.test/)).toBeNull();
});
