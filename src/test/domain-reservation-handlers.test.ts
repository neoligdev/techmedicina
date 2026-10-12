import { it, expect, vi } from "vitest";
import { createDomainReservationHandlers } from "../lib/admin/domain-reservations.server";
import { domainReservationInputSchema } from "../features/auth/domain-reservations";
const id = "00000000-0000-4000-8000-000000000001";
const input = { clinicId: id, hostname: "gestao.clinica.test", environment: "clinic_portal" };
const domain = {
  id,
  clinic_id: id,
  hostname: input.hostname,
  environment: input.environment,
  status: "pending_verification",
  revision: 1,
  created_at: "2026-10-12T12:00:00Z",
};
function request(body: unknown = input) {
  return new Request("https://example.test/api/domains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
it.each([null, { identity: { userId: id, links: [] } }])(
  "nega antes de consultar ou gravar: %j",
  async (context) => {
    const read = vi.fn(),
      write = vi.fn();
    const api = createDomainReservationHandlers(async () => context, read, write);
    expect((await api.POST(request())).status).toBe(context ? 403 : 401);
    expect(write).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  },
);
it("reserva apenas dados permitidos e não aceita ativação ou dono forjado", async () => {
  const write = vi.fn().mockResolvedValue(domain);
  const api = createDomainReservationHandlers(
    async () => ({ identity: { userId: id, globalRole: "super_admin", links: [] } }),
    vi.fn(),
    write,
  );
  expect((await api.POST(request())).status).toBe(201);
  expect((await api.POST(request({ ...input, status: "active" }))).status).toBe(400);
  expect((await api.POST(request({ ...input, actor_user_id: id }))).status).toBe(400);
  expect(write).toHaveBeenCalledTimes(1);
});
it("não devolve domínio de outra clínica", async () => {
  const api = createDomainReservationHandlers(
    async () => ({ identity: { userId: id, globalRole: "super_admin", links: [] } }),
    vi.fn().mockResolvedValue([{ ...domain, clinic_id: "00000000-0000-4000-8000-000000000002" }]),
    vi.fn(),
  );
  const response = await api.GET(new Request(`https://example.test/api/domains?clinicId=${id}`));
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it.each(["A.test", "admin.test", "a.test:443", "a..test", "a.test/other"])(
  "rejeita host não canônico: %s",
  (hostname) => {
    expect(domainReservationInputSchema.safeParse({ ...input, hostname }).success).toBe(false);
  },
);
it("limita corpo sem depender de Content-Length", async () => {
  const write = vi.fn();
  const api = createDomainReservationHandlers(
    async () => ({ identity: { userId: id, globalRole: "super_admin", links: [] } }),
    vi.fn(),
    write,
  );
  expect((await api.POST(request({ padding: "x".repeat(4097) }))).status).toBe(413);
  expect(write).not.toHaveBeenCalled();
});
