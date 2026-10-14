import { expect, it, vi } from "vitest";
import { createJourneyEndpoints } from "@/lib/journey/endpoints.server";
import { createJourneyRpcRepository } from "@/lib/journey/rpc-repository.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  actor = "33333333-3333-4333-8333-333333333333",
  requestId = "44444444-4444-4444-8444-444444444444";
const input = { patientId: patient, sourceRequestId: requestId, kind: "sleep", cadence: "weekly" };
function setup(granted = true) {
  const identity: AuthenticatedIdentity = {
    userId: actor,
    links: [
      {
        clinicId: clinic,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: granted
          ? [
              { resource: "journey_goals", action: "read" },
              { resource: "journey_goals", action: "create" },
            ]
          : [],
      },
    ],
  };
  const session = { identity, marker: "verified-request-bearer" };
  const transport = vi.fn().mockResolvedValue({
    data: {
      id: requestId,
      clinic_id: clinic,
      patient_id: patient,
      patient_user_id: patient,
      actor_user_id: actor,
      source_request_id: requestId,
      kind: "sleep",
      cadence: "weekly",
      state: "draft",
      created_at: "2026-10-14T12:00:00Z",
    },
    error: null,
  });
  const repository = createJourneyRpcRepository(transport);
  const bind = vi.fn().mockReturnValue(repository.goalDraftRpc);
  const resolveSession = vi.fn().mockResolvedValue(session);
  const endpoints = createJourneyEndpoints({
    lookup: async (hostname) => ({
      hostname,
      clinicId: clinic,
      environment: hostname === "app.example.com" ? "patient_pwa" : "clinic_portal",
      status: "active",
    }),
    resolveSession,
    preferenceRpc: () => repository.preferenceRpc,
    goalRepository: () => repository.repository,
    selfReportRpc: () => repository.selfReportRpc,
    goalDraftRpc: bind,
  });
  return { endpoints, bind, transport, session, resolveSession };
}
function request(host = "clinic.example.com", body: unknown = input) {
  return new Request(`https://${host}/api/journey/goal-drafts`, {
    method: "POST",
    headers: { host, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
it("binds draft RPC to verified medical request session and derived clinic", async () => {
  const { endpoints, bind, transport, session, resolveSession } = setup();
  const req = request();
  const response = await endpoints.drafts(req);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(resolveSession).toHaveBeenCalledWith(req);
  expect(bind).toHaveBeenCalledWith(session);
  expect(transport).toHaveBeenCalledWith("tm_create_journey_goal_draft", {
    p_clinic_id: clinic,
    p_patient_id: patient,
    p_source_request_id: requestId,
    p_kind: "sleep",
    p_cadence: "weekly",
  });
});
it("rejects PWA host before resolving session or obtaining transport", async () => {
  const { endpoints, bind, transport, resolveSession } = setup();
  expect((await endpoints.drafts(request("app.example.com"))).status).toBe(403);
  expect(resolveSession).not.toHaveBeenCalled();
  expect(bind).not.toHaveBeenCalled();
  expect(transport).not.toHaveBeenCalled();
});
it("rejects missing grants and injected tenant before SQL", async () => {
  const denied = setup(false);
  expect((await denied.endpoints.drafts(request())).status).toBe(403);
  expect(denied.transport).not.toHaveBeenCalled();
  const allowed = setup();
  expect(
    (await allowed.endpoints.drafts(request("clinic.example.com", { ...input, clinicId: clinic })))
      .status,
  ).toBe(400);
  expect(allowed.transport).not.toHaveBeenCalled();
});
it("preserves SQL conflict and current grant revocation as safe HTTP outcomes", async () => {
  const { endpoints, transport } = setup();
  transport.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
  expect((await endpoints.drafts(request())).status).toBe(409);
  transport.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
  expect((await endpoints.drafts(request())).status).toBe(403);
});
