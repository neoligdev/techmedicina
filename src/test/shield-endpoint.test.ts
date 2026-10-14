import { expect, it, vi } from "vitest";
import { createOwnShieldEndpoint } from "@/lib/journey/shield-endpoint.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222";
function setup() {
  const identity: AuthenticatedIdentity = {
    userId: clinic,
    links: [
      {
        clinicId: clinic,
        patientId: patient,
        role: "paciente",
        isActive: true,
        grants: [{ resource: "journey_shields", action: "read" }],
      },
    ],
  };
  const session = { identity, marker: "verified" };
  const resolveSession = vi.fn().mockResolvedValue(session),
    read = vi.fn().mockResolvedValue(null),
    bind = vi.fn().mockReturnValue(read);
  const lookup = vi.fn(async (hostname: string) => ({
    hostname,
    clinicId: clinic,
    environment: hostname === "app.example.com" ? "patient_pwa" : "clinic_portal",
    status: "active",
  }));
  return {
    endpoint: createOwnShieldEndpoint({ lookup, resolveSession, read: bind }),
    session,
    resolveSession,
    read,
    bind,
    lookup,
  };
}
const request = (suffix = "", host = "app.example.com", method = "GET") =>
  new Request(`https://${host}/api/journey/shields${suffix}`, { method, headers: { host } });
it("binds repository to same verified session and derives patient scope", async () => {
  const { endpoint, session, resolveSession, read, bind } = setup();
  const req = request();
  const result = await endpoint(req);
  expect(result.status).toBe(503); // Invalid provider payload never reaches browser.
  expect(result.headers.get("Cache-Control")).toBe("private, no-store");
  expect(resolveSession).toHaveBeenCalledWith(req);
  expect(bind).toHaveBeenCalledWith(session);
  expect(read).toHaveBeenCalledWith(clinic, patient);
  expect(await result.json()).toEqual({ error: "Escudos temporariamente indisponíveis" });
});
it("refuses identifiers/query and mutations before session lookup", async () => {
  const { endpoint, resolveSession, read } = setup();
  expect((await endpoint(request(`?patientId=${patient}`))).status).toBe(400);
  expect((await endpoint(request("", "app.example.com", "POST"))).status).toBe(405);
  expect(resolveSession).not.toHaveBeenCalled();
  expect(read).not.toHaveBeenCalled();
});
it("wrong environment or suspended host denies before Auth", async () => {
  const { endpoint, lookup, resolveSession } = setup();
  expect((await endpoint(request("", "clinic.example.com"))).status).toBe(403);
  lookup.mockResolvedValueOnce({
    hostname: "app.example.com",
    clinicId: clinic,
    environment: "patient_pwa",
    status: "suspended",
  });
  expect((await endpoint(request())).status).toBe(403);
  expect(resolveSession).not.toHaveBeenCalled();
});
it("missing session never queries shields", async () => {
  const { endpoint, resolveSession, read } = setup();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(request())).status).toBe(401);
  expect(read).not.toHaveBeenCalled();
});
