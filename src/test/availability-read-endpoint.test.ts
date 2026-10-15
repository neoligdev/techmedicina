import { expect, it, vi } from "vitest";
import { createAvailabilityReadEndpoint } from "@/lib/agenda/availability-read-endpoint.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
const clinic = "11111111-1111-4111-8111-111111111111",
  doctor = "22222222-2222-4222-8222-222222222222";
function setup() {
  const identity: AuthenticatedIdentity = {
    userId: doctor,
    links: [
      {
        clinicId: clinic,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: [{ resource: "agenda", action: "read" }],
      },
    ],
  };
  const session = { identity };
  const read = vi.fn().mockResolvedValue([]),
    bind = vi.fn().mockReturnValue(read),
    resolveSession = vi.fn().mockResolvedValue(session);
  return {
    identity,
    session,
    read,
    bind,
    resolveSession,
    endpoint: createAvailabilityReadEndpoint({
      lookup: async (hostname) => ({
        hostname,
        clinicId: clinic,
        environment: hostname === "app.example.com" ? "patient_pwa" : "clinic_portal",
        status: "active",
      }),
      resolveSession,
      reader: bind,
    }),
  };
}
const baseQuery = "start=2026-10-15T00%3A00%3A00Z&end=2026-10-16T00%3A00%3A00Z";
function request(extra = "", host = "clinic.example.com", method = "GET") {
  return new Request(`https://${host}/api/agenda/availability?${baseQuery}${extra}`, {
    method,
    headers: { host },
  });
}
it("returns private own page using exact resolved session", async () => {
  const { endpoint, bind, session, read } = setup();
  const response = await endpoint(request("&limit=2"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("Vary")).toBe("Authorization, Host");
  expect(bind).toHaveBeenCalledWith(session);
  expect(read).toHaveBeenCalledWith(
    expect.objectContaining({ clinicId: clinic, doctorUserId: doctor, take: 3 }),
  );
  expect(await response.json()).toEqual({
    page: { clinicId: clinic, doctorUserId: doctor, items: [], next: null },
  });
});
it.each([
  "&clinicId=other",
  "&doctorUserId=other",
  "&start=duplicate",
  "&limit=0",
  "&limit=51",
  "&afterId=" + clinic,
  "&limit=1e1",
])("rejects query %s before data reader", async (extra) => {
  const { endpoint, read } = setup();
  expect((await endpoint(request(extra))).status).toBe(400);
  expect(read).not.toHaveBeenCalled();
});
it("rejects PWA host, missing session and revoked grant", async () => {
  const { endpoint, resolveSession, session, read } = setup();
  expect((await endpoint(request("", "app.example.com"))).status).toBe(403);
  expect(resolveSession).not.toHaveBeenCalled();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(request())).status).toBe(401);
  session.identity.links[0]!.grants = [];
  expect((await endpoint(request())).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
});
it("safe errors and method rejection do not expose repository detail", async () => {
  const { endpoint, read } = setup();
  const wrong = await endpoint(request("", "clinic.example.com", "POST"));
  expect(wrong.status).toBe(405);
  expect(wrong.headers.get("Allow")).toBe("GET");
  read.mockRejectedValueOnce(new Error("private SQL diagnostic"));
  const response = await endpoint(request());
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("private SQL");
});
