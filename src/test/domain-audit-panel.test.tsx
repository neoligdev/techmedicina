import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DomainAuditPanel } from "../features/auth/domain-audit-panel";
const clinicId = "00000000-0000-4000-8000-000000000001",
  domainId = "00000000-0000-4000-8000-000000000002";
const payload = {
  domain: {
    id: domainId,
    clinic_id: clinicId,
    hostname: "gestao.qa.test",
    environment: "clinic_portal",
    status: "pending_verification",
    revision: 1,
    created_at: "2026-10-12T12:00:00Z",
  },
  events: [
    {
      id: domainId,
      domain_id: domainId,
      actor_user_id: clinicId,
      action: "domain_reserved",
      occurred_at: "2026-10-12T12:00:00Z",
    },
  ],
  hasMore: false,
  nextCursor: null,
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("consulta explicitamente e mostra autor/horário sem link de domínio ativo", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json(payload));
  vi.stubGlobal("fetch", fetcher);
  render(<DomainAuditPanel token="fixture" clinicId={clinicId} domainId={domainId} />);
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Consultar eventos da reserva" }));
  await screen.findByText(`Autor: ${clinicId}`);
  expect(screen.queryByRole("link")).toBeNull();
  expect(fetcher).toHaveBeenCalledWith(
    expect.stringContaining(`clinicId=${clinicId}&domainId=${domainId}`),
    expect.objectContaining({ cache: "no-store" }),
  );
});
it("não mostra auditoria retornada de outra clínica", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ ...payload, domain: { ...payload.domain, clinic_id: domainId } }),
      ),
  );
  render(<DomainAuditPanel token="fixture" clinicId={clinicId} domainId={domainId} />);
  fireEvent.click(screen.getByRole("button", { name: "Consultar eventos da reserva" }));
  await screen.findByRole("alert");
  expect(screen.queryByText(`Autor: ${clinicId}`)).toBeNull();
});
