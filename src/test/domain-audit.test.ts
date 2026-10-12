import { expect, it, vi } from "vitest";
import { createDomainAudit } from "../lib/admin/domain-audit.server";
const clinic = "00000000-0000-4000-8000-000000000001";
const id = "00000000-0000-4000-8000-000000000002";
const domain = {
  id,
  clinic_id: clinic,
  hostname: "gestao.qa.test",
  environment: "clinic_portal",
  status: "pending_verification",
  revision: 1,
  created_at: "2026-10-12T12:00:00Z",
};
const event = {
  id,
  domain_id: id,
  actor_user_id: clinic,
  action: "domain_reserved",
  occurred_at: "2026-10-12T12:00:00Z",
};
const identity = { userId: clinic, globalRole: "super_admin" as const, links: [] };
const request = (extra = "") =>
  new Request(
    `https://example.test/api/platform/domain-audit?clinicId=${clinic}&domainId=${id}${extra}`,
  );
it.each([null, { identity: { userId: clinic, links: [] } }])(
  "nega antes de consultar com sessão %j",
  async (context) => {
    const read = vi.fn(),
      events = vi.fn();
    const response = await createDomainAudit(async () => context, read, events)(request());
    expect(response.status).toBe(context ? 403 : 401);
    expect(read).not.toHaveBeenCalled();
    expect(events).not.toHaveBeenCalled();
  },
);
it("retorna somente auditoria da reserva e clínica solicitadas sem cache", async () => {
  const read = vi.fn().mockResolvedValue([domain]),
    events = vi.fn().mockResolvedValue([event]);
  const response = await createDomainAudit(async () => ({ identity }), read, events)(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    domain,
    events: [event],
    hasMore: false,
    nextCursor: null,
  });
  expect(read).toHaveBeenCalledWith({ identity }, clinic, id);
});
it.each(["&before=invalid&beforeId=" + id, "&beforeId=" + id, "&domainId=" + id, "&unknown=true"])(
  "recusa consulta inválida %s antes de ler",
  async (extra) => {
    const read = vi.fn();
    const response = await createDomainAudit(
      async () => ({ identity }),
      read,
      vi.fn(),
    )(request(extra));
    expect(response.status).toBe(400);
    expect(read).not.toHaveBeenCalled();
  },
);
it("nega domínio de outra clínica e evento de outra reserva", async () => {
  const read = vi.fn().mockResolvedValue([{ ...domain, clinic_id: id }]),
    events = vi.fn();
  const handler = createDomainAudit(async () => ({ identity }), read, events);
  expect((await handler(request())).status).toBe(503);
  expect(events).not.toHaveBeenCalled();
  read.mockResolvedValue([domain]);
  events.mockResolvedValue([{ ...event, domain_id: clinic }]);
  expect((await handler(request())).status).toBe(503);
});
it("reserva inexistente não consulta auditoria", async () => {
  const events = vi.fn();
  expect(
    (
      await createDomainAudit(
        async () => ({ identity }),
        async () => [],
        events,
      )(request())
    ).status,
  ).toBe(404);
  expect(events).not.toHaveBeenCalled();
});
it("pagina com cursor de horário e ID e limita cem eventos", async () => {
  const events = vi.fn().mockResolvedValue(
    Array.from({ length: 101 }, (_, index) => ({
      ...event,
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    })),
  );
  const response = await createDomainAudit(
    async () => ({ identity }),
    async () => [domain],
    events,
  )(request(`&before=${event.occurred_at}&beforeId=${id}`));
  const result = await response.json();
  expect(result.events).toHaveLength(100);
  expect(result.hasMore).toBe(true);
  expect(result.nextCursor.beforeId).toBe(result.events[99].id);
  expect(events).toHaveBeenCalledWith({ identity }, id, {
    before: event.occurred_at,
    beforeId: id,
  });
});
