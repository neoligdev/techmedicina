import { expect, it, vi } from "vitest";
import { createJourneySelfReportHandler } from "../lib/journey/self-report-handler.server";
import { AuthError } from "../lib/auth/guards.server";
import type { AuthContext } from "../lib/auth/core";
const clinic = "00000000-0000-4000-8000-000000000001";
const patient = "00000000-0000-4000-8000-000000000002";
const id = "00000000-0000-4000-8000-000000000003";
const context: AuthContext = {
  currentClinicId: clinic,
  identity: {
    userId: patient,
    links: [
      {
        clinicId: clinic,
        patientId: patient,
        isActive: true,
        role: "paciente",
        grants: [{ resource: "journey_events", action: "create" }],
      },
    ],
  },
};
const input = { goalId: id, sourceEventId: id, occurredAt: "2026-10-13T00:00:00Z" };
const row = {
  id,
  clinic_id: clinic,
  patient_id: patient,
  goal_id: id,
  goal_version: 1,
  policy_version_id: id,
  source_event_id: id,
  source: "self_report",
  actor_user_id: patient,
  occurred_at: input.occurredAt,
  received_at: "2026-10-13T00:01:00Z",
};

const url = "https://app.example.com/api/journey/self-report";
function post(body = JSON.stringify(input), type = "application/json") {
  return new Request(url, { method: "POST", headers: { "content-type": type }, body });
}
it("POST retorna recibo sem autor interno e sem cache", async () => {
  const rpc = vi.fn().mockResolvedValue(row);
  const handler = createJourneySelfReportHandler(async () => ({ context, rpc }));
  const response = await handler(post());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const body = await response.json();
  expect(body.receipt.goalId).toBe(id);
  expect(body.receipt.actorUserId).toBeUndefined();
});
it.each([
  ["{", "application/json", 400],
  ["{}", "text/plain", 415],
  ["x".repeat(4097), "application/json", 413],
])("corpo inválido é recusado", async (body, type, status) => {
  const rpc = vi.fn();
  const handler = createJourneySelfReportHandler(async () => ({ context, rpc }));
  expect((await handler(post(String(body), String(type)))).status).toBe(status);
  expect(rpc).not.toHaveBeenCalled();
});
it("método/query inválidos e sessão ausente não gravam", async () => {
  const resolve = vi.fn().mockResolvedValue(null);
  const handler = createJourneySelfReportHandler(resolve);
  expect((await handler(new Request(url))).status).toBe(405);
  expect(resolve).not.toHaveBeenCalled();
  expect((await handler(new Request(url + "?clinicId=" + clinic, { method: "POST" }))).status).toBe(
    400,
  );
  expect(resolve).not.toHaveBeenCalled();
  expect((await handler(post())).status).toBe(401);
});
it("conflito não expõe erro SQL nem confirma registro", async () => {
  const handler = createJourneySelfReportHandler(async () => ({
    context,
    rpc: async () => {
      throw new AuthError("private SQL details", 409);
    },
  }));
  const response = await handler(post());
  expect(response.status).toBe(409);
  const body = await response.json();
  expect(body.receipt).toBeUndefined();
  expect(body.error).not.toContain("private SQL");
});
