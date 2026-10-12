import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), query: vi.fn() }));
vi.mock("../lib/admin/clinic-branding-runtime.server", () => ({
  resolveBrandingContext: mocks.resolve,
  query: mocks.query,
}));
import { domainAuditResponse } from "../lib/admin/domain-audit-runtime.server";
const clinic = "00000000-0000-4000-8000-000000000001",
  id = "00000000-0000-4000-8000-000000000002";
const domain = {
  id,
  clinic_id: clinic,
  hostname: "gestao.qa.test",
  environment: "clinic_portal",
  status: "pending_verification",
  revision: 1,
  created_at: "2026-10-12T12:00:00Z",
};
const context = { identity: { userId: clinic, globalRole: "super_admin", links: [] } };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolve.mockResolvedValue(context);
});
it("mantém filtros de clínica/reserva e pagina eventos com o mesmo contexto", async () => {
  mocks.query.mockResolvedValueOnce([domain]).mockResolvedValueOnce([]);
  const response = await domainAuditResponse(
    new Request(
      `https://example.test/api/platform/domain-audit?clinicId=${clinic}&domainId=${id}&before=2026-10-12T12:00:00Z&beforeId=${id}`,
    ),
  );
  expect(response.status).toBe(200);
  const [first, second] = mocks.query.mock.calls;
  expect(first?.[0]).toBe(context);
  expect(second?.[0]).toBe(context);
  const domainParams = new URLSearchParams(first?.[1].split("?")[1]);
  expect(domainParams.get("clinic_id")).toBe(`eq.${clinic}`);
  expect(domainParams.get("id")).toBe(`eq.${id}`);
  const eventParams = new URLSearchParams(second?.[1].split("?")[1]);
  expect(eventParams.get("domain_id")).toBe(`eq.${id}`);
  expect(eventParams.get("limit")).toBe("101");
  expect(eventParams.get("order")).toBe("occurred_at.desc,id.desc");
  expect(eventParams.get("or")).toBe(
    `(occurred_at.lt.2026-10-12T12:00:00Z,and(occurred_at.eq.2026-10-12T12:00:00Z,id.lt.${id}))`,
  );
});
it("sessão não verificada não alcança transporte", async () => {
  mocks.resolve.mockResolvedValue(null);
  expect(
    (
      await domainAuditResponse(
        new Request(
          `https://example.test/api/platform/domain-audit?clinicId=${clinic}&domainId=${id}`,
        ),
      )
    ).status,
  ).toBe(401);
  expect(mocks.query).not.toHaveBeenCalled();
});
