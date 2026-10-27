// @vitest-environment node
import { expect, it, vi } from "vitest";
import { AuthError } from "@/lib/auth/guards.server";
import { createPatientJourneyRuntime } from "@/lib/journey/patient-runtime.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  user = "33333333-3333-4333-8333-333333333333";
const identity: AuthenticatedIdentity = {
  userId: user,
  links: [
    {
      clinicId: clinic,
      patientId: patient,
      role: "paciente",
      isActive: true,
      grants: [
        { resource: "journey_shields", action: "read" },
        { resource: "journey_events", action: "create" },
      ],
    },
  ],
};
const request = (path = "context", token = "qa", method = "GET", body?: string) =>
  new Request(`https://app.example.com/api/journey/${path}`, {
    method,
    headers: {
      host: "app.example.com",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body } : {}),
  });
function setup() {
  const session = { identity, bearer: "qa" };
  const resolveSession = vi.fn(async () => session as typeof session | null);
  const rpc = vi.fn(async (_session: typeof session, name: string) => {
    if (name === "tm_resolve_patient_journey_host")
      return {
        hostname: "app.example.com",
        clinicId: clinic,
        environment: "patient_pwa",
        status: "active",
      };
    if (name === "tm_get_patient_shield_overview") return { state: null, history: [] };
    throw new Error("unexpected RPC");
  });
  return {
    session,
    resolveSession,
    rpc,
    run: createPatientJourneyRuntime({ resolveSession, rpc }),
  };
}
it("binds host and shield reads to one verified request session with distinct patient UUID", async () => {
  const { run, session, resolveSession, rpc } = setup();
  const req = request("shields");
  const result = await run("shields", req);
  expect(result.status).toBe(200);
  const body = await result.json();
  expect(body.overview.patientId).toBe(patient);
  expect(body.overview.state.scoreAverage).toBeNull();
  expect(resolveSession).toHaveBeenCalledExactlyOnceWith(req);
  expect(rpc).toHaveBeenNthCalledWith(1, session, "tm_resolve_patient_journey_host", {
    p_hostname: "app.example.com",
  });
  expect(rpc).toHaveBeenNthCalledWith(2, session, "tm_get_patient_shield_overview", {
    p_clinic_id: clinic,
    p_patient_id: patient,
  });
});
it("does not cache session between requests", async () => {
  const { run, resolveSession } = setup();
  expect((await run("context", request())).status).toBe(200);
  resolveSession.mockResolvedValueOnce(null);
  expect((await run("context", request("context", "revoked"))).status).toBe(401);
  expect(resolveSession).toHaveBeenCalledTimes(2);
});
it("missing host SQL or denied lookup never reaches clinical read", async () => {
  const { run, rpc } = setup();
  rpc.mockRejectedValueOnce(new Error("PGRST202 private details"));
  const error = await run("shields", request("shields"));
  expect(error.status).toBe(503);
  expect(await error.text()).not.toContain("PGRST202");
  expect(rpc).toHaveBeenCalledTimes(1);
  rpc.mockResolvedValueOnce(null as never);
  expect((await run("shields", request("shields"))).status).toBe(403);
});
it("preserves same-bearer database denial and validates mutation before RPC", async () => {
  const { run, rpc } = setup();
  rpc.mockImplementationOnce(async () => {
    throw new AuthError("Denied", 403);
  });
  expect((await run("shields", request("shields"))).status).toBe(403);
  rpc.mockClear();
  expect(
    (await run("selfReport", request("self-report?clinicId=other", "qa", "POST", "{}"))).status,
  ).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
});
