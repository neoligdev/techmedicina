import { afterEach, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DomainAdministration } from "../features/auth/domain-administration";
const id = "00000000-0000-4000-8000-000000000001";
const clinics = [{ id, name: "QA", is_active: false, created_at: "2026-10-12T12:00:00Z" }];
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
      Response.json(init?.method === "POST" ? { domain } : { domains: [], hasMore: false }, {
        status: init?.method === "POST" ? 201 : 200,
      }),
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
      }),
    ),
  );
  render(<DomainAdministration token="fixture" clinics={clinics} />);
  await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  expect(screen.queryByText(/outro.qa.test/)).toBeNull();
});
