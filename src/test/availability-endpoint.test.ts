import { expect, it, vi } from "vitest";
import { createAvailabilityEndpoint } from "@/lib/agenda/availability-endpoint.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
const clinic = "11111111-1111-4111-8111-111111111111",
  doctor = "22222222-2222-4222-8222-222222222222",
  id = "33333333-3333-4333-8333-333333333333";
const input = {
  sourceRequestId: id,
  interval: { startsAt: "2026-10-15T09:00:00-03:00", endsAt: "2026-10-15T10:00:00-03:00" },
};
const saved = {
  id,
  clinic_id: clinic,
  doctor_user_id: doctor,
  source_request_id: id,
  starts_at: "2026-10-15T12:00:00Z",
  ends_at: "2026-10-15T13:00:00Z",
  created_at: "2026-10-14T12:00:00Z",
};
function setup() {
  const identity: AuthenticatedIdentity = {
    userId: doctor,
    links: [
      {
        clinicId: clinic,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: [{ resource: "agenda", action: "write" }],
      },
    ],
  };
  const session = { identity, marker: "same-bearer" };
  const resolveSession = vi.fn().mockResolvedValue(session),
    rpc = vi.fn().mockResolvedValue({ data: saved, error: null }),
    bind = vi.fn().mockReturnValue(rpc);
  const endpoint = createAvailabilityEndpoint({
    lookup: async (hostname) => ({
      hostname,
      clinicId: clinic,
      environment: hostname === "app.example.com" ? "patient_pwa" : "clinic_portal",
      status: "active",
    }),
    resolveSession,
    rpc: bind,
  });
  return { endpoint, rpc, bind, session, resolveSession };
}
function request(body: unknown = input, host = "clinic.example.com", suffix = "") {
  return new Request(`https://${host}/api/agenda/availability${suffix}`, {
    method: "POST",
    headers: { host, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
it("binds atomic write to verified medical session and validates receipt", async () => {
  const { endpoint, rpc, bind, session } = setup();
  const result = await endpoint(request());
  expect(result.status).toBe(200);
  expect(result.headers.get("Cache-Control")).toContain("no-store");
  expect(bind).toHaveBeenCalledWith(session);
  expect(rpc).toHaveBeenCalledWith({
    p_clinic_id: clinic,
    p_source_request_id: id,
    p_starts_at: input.interval.startsAt,
    p_ends_at: input.interval.endsAt,
  });
  expect((await result.json()).receipt.interval.startsAt).toBe("2026-10-15T12:00:00.000Z");
});
it("PWA host is rejected before session lookup", async () => {
  const { endpoint, resolveSession, rpc } = setup();
  expect((await endpoint(request(input, "app.example.com"))).status).toBe(403);
  expect(resolveSession).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalled();
});
it("injected clinician/clinic, query and oversized body cannot write", async () => {
  const { endpoint, rpc } = setup();
  expect((await endpoint(request({ ...input, doctorUserId: doctor }))).status).toBe(400);
  expect((await endpoint(request(input, "clinic.example.com", "?clinicId=other"))).status).toBe(
    400,
  );
  expect((await endpoint(request({ extra: "x".repeat(5000) }))).status).toBe(413);
  expect(rpc).not.toHaveBeenCalled();
});
it.each(["clinic_id", "doctor_user_id", "source_request_id"])(
  "foreign %s receipt is never confirmed",
  async (key) => {
    const { endpoint, rpc } = setup();
    rpc.mockResolvedValueOnce({
      data: { ...saved, [key]: key === "clinic_id" ? doctor : clinic },
      error: null,
    });
    const result = await endpoint(request());
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ error: "Disponibilidade temporariamente indisponível" });
  },
);
it.each([
  ["23505", 409],
  ["42501", 403],
  ["22023", 400],
])("SQL %s preserves safe status %s", async (code, status) => {
  const { endpoint, rpc } = setup();
  rpc.mockResolvedValueOnce({ data: null, error: { code } });
  expect((await endpoint(request())).status).toBe(status);
});
