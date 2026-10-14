import { expect, it, vi } from "vitest";
import { createJourneyEndpoints } from "../lib/journey/endpoints.server";
import type { AuthenticatedIdentity } from "../lib/auth/core";
const clinic = "00000000-0000-4000-8000-000000000001";
const patient = "00000000-0000-4000-8000-000000000002";
it("participação conserva sessão verificada e não aceita host médico no PWA", async () => {
  const identity: AuthenticatedIdentity = {
    userId: patient,
    links: [{ clinicId: clinic, patientId: patient, role: "paciente", isActive: true, grants: [] }],
  };
  const session = { identity, transportMarker: "same-session" };
  const resolveSession = vi.fn().mockResolvedValue(session);
  const rpc = vi.fn().mockResolvedValue({
    clinic_id: clinic,
    patient_id: patient,
    patient_user_id: patient,
    is_enabled: false,
    revision: 0,
  });
  const preferenceRpc = vi.fn().mockReturnValue(rpc);
  const goalRepository = vi.fn();
  const endpoints = createJourneyEndpoints({
    lookup: async (host) => ({
      hostname: host,
      clinicId: clinic,
      environment: host === "app.example.com" ? "patient_pwa" : "clinic_portal",
      status: "active",
    }),
    resolveSession,
    preferenceRpc,
    goalRepository,
    selfReportRpc: vi.fn(),
  });
  const req = new Request("https://app.example.com/api/journey/participation", {
    headers: { host: "app.example.com" },
  });
  expect((await endpoints.participation.GET(req)).status).toBe(200);
  expect(resolveSession).toHaveBeenCalledWith(req);
  expect(preferenceRpc).toHaveBeenCalledWith(session);
  expect(rpc).toHaveBeenCalledWith("tm_get_journey_preference", { p_patient_id: patient });
  resolveSession.mockClear();
  preferenceRpc.mockClear();
  const wrong = new Request("https://clinica.example.com/api/journey/participation", {
    headers: { host: "clinica.example.com" },
  });
  expect((await endpoints.participation.GET(wrong)).status).toBe(403);
  expect(resolveSession).not.toHaveBeenCalled();
  expect(preferenceRpc).not.toHaveBeenCalled();
  expect((await endpoints.goals(req)).status).toBe(403);
  expect((await endpoints.pause(new Request(req, { method: "POST" }))).status).toBe(403);
  expect(goalRepository).not.toHaveBeenCalled();
});
