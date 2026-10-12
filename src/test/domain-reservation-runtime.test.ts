import { it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), query: vi.fn() }));
vi.mock("../lib/admin/clinic-branding-runtime.server", () => ({
  resolveBrandingContext: mocks.resolve,
  query: mocks.query,
}));
import { domainReservationHandlers } from "../lib/admin/domain-reservations-runtime.server";
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
const context = {
  identity: { userId: id, globalRole: "super_admin", links: [] },
  authorization: "Bearer fixture",
  key: "sb_publishable_fixture",
  base: "https://example.test",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolve.mockResolvedValue(context);
});
it("consulta limitada com contexto validado e filtro exato", async () => {
  mocks.query.mockResolvedValue([domain]);
  const response = await domainReservationHandlers.GET(
    new Request(`https://example.test/api/platform/domains?clinicId=${id}`),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ domains: [domain], hasMore: false, nextCursor: null });
  expect(mocks.query).toHaveBeenCalledWith(context, expect.stringContaining(`clinic_id=eq.${id}`));
  expect(mocks.query.mock.calls[0]?.[1]).toContain("limit=101");
});
it("RPC recebe somente clínica hostname e finalidade", async () => {
  mocks.query.mockResolvedValue(domain);
  const response = await domainReservationHandlers.POST(
    new Request("https://example.test/api/platform/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  expect(response.status).toBe(201);
  expect(mocks.query).toHaveBeenCalledWith(context, "rest/v1/rpc/tm_reserve_domain", {
    method: "POST",
    body: JSON.stringify({
      p_clinic_id: id,
      p_hostname: input.hostname,
      p_environment: input.environment,
    }),
  });
});
it("nega sessão ausente antes de chamar transporte", async () => {
  mocks.resolve.mockResolvedValue(null);
  expect(
    (
      await domainReservationHandlers.GET(
        new Request(`https://example.test/api/platform/domains?clinicId=${id}`),
      )
    ).status,
  ).toBe(401);
  expect(mocks.query).not.toHaveBeenCalled();
});
it("indica mais resultados sem devolver além de cem", async () => {
  mocks.query.mockResolvedValue(Array.from({ length: 101 }, () => domain));
  const response = await domainReservationHandlers.GET(
    new Request(`https://example.test/api/platform/domains?clinicId=${id}`),
  );
  const result = await response.json();
  expect(result.domains).toHaveLength(100);
  expect(result.hasMore).toBe(true);
  expect(result.nextCursor).toBe(domain.hostname);
});
it("usa cursor validado sem remover filtro da clínica", async () => {
  mocks.query.mockResolvedValue([]);
  const response = await domainReservationHandlers.GET(
    new Request(`https://example.test/api/platform/domains?clinicId=${id}&after=gestao.a.test`),
  );
  expect(response.status).toBe(200);
  const params = new URLSearchParams(mocks.query.mock.calls[0]?.[1].split("?")[1]);
  expect(params.get("clinic_id")).toBe(`eq.${id}`);
  expect(params.get("hostname")).toBe("gt.gestao.a.test");
  expect(params.get("order")).toBe("hostname.asc,id.asc");
});
it.each(["a.test,clinic_id.eq.other", "a.test&clinicId=other", "", "A.test"])(
  "nega cursor inválido antes do transporte: %s",
  async (after) => {
    const response = await domainReservationHandlers.GET(
      new Request(
        `https://example.test/api/platform/domains?clinicId=${id}&after=${encodeURIComponent(after)}`,
      ),
    );
    expect(response.status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  },
);
