import { expect, it, vi } from "vitest";
import { createJourneyGoalDraftHandler } from "../lib/journey/goal-draft-handler.server";
import { AuthError } from "../lib/auth/guards.server";
import type { AuthContext } from "../lib/auth/core";
const clinic = "00000000-0000-4000-8000-000000000001",
  patient = "00000000-0000-4000-8000-000000000002",
  doctor = "00000000-0000-4000-8000-000000000003";
const context: AuthContext = {
  currentClinicId: clinic,
  identity: {
    userId: doctor,
    links: [
      {
        clinicId: clinic,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: [
          { resource: "journey_goals", action: "read" },
          { resource: "journey_goals", action: "create" },
        ],
      },
    ],
  },
};
const input = {
  patientId: patient,
  sourceRequestId: patient,
  kind: "hydration",
  cadence: "weekly",
};
const row = {
  id: patient,
  clinic_id: clinic,
  patient_id: patient,
  patient_user_id: patient,
  actor_user_id: doctor,
  source_request_id: patient,
  kind: "hydration",
  cadence: "weekly",
  state: "draft",
  created_at: "2026-10-13T00:00:00+00:00",
};

const url = "https://clinica.example.com/api/journey/goals/drafts";
const post = (body = JSON.stringify(input), type = "application/json") =>
  new Request(url, { method: "POST", headers: { "content-type": type }, body });
it("POST retorna apenas rascunho confirmado sem cache", async () => {
  const handler = createJourneyGoalDraftHandler(async () => ({ context, rpc: async () => row }));
  const response = await handler(post());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const body = await response.json();
  expect(body.draft.state).toBe("draft");
  expect(body.draft.actor_user_id).toBeUndefined();
});
it.each([
  ["{", "application/json", 400],
  ["{}", "text/plain", 415],
  ["x".repeat(4097), "application/json", 413],
])("payload inválido não grava", async (body, type, status) => {
  const rpc = vi.fn();
  const handler = createJourneyGoalDraftHandler(async () => ({ context, rpc }));
  expect((await handler(post(String(body), String(type)))).status).toBe(status);
  expect(rpc).not.toHaveBeenCalled();
});
it("método e query inválidos não resolvem sessão", async () => {
  const resolve = vi.fn().mockResolvedValue(null);
  const handler = createJourneyGoalDraftHandler(resolve);
  expect((await handler(new Request(url))).status).toBe(405);
  expect((await handler(new Request(url + "?clinicId=" + clinic, { method: "POST" }))).status).toBe(
    400,
  );
  expect(resolve).not.toHaveBeenCalled();
  expect((await handler(post())).status).toBe(401);
});
it("conflito não publica nem revela erro interno", async () => {
  const handler = createJourneyGoalDraftHandler(async () => ({
    context,
    rpc: async () => {
      throw new AuthError("private SQL details", 409);
    },
  }));
  const response = await handler(post());
  expect(response.status).toBe(409);
  const body = await response.json();
  expect(body.draft).toBeUndefined();
  expect(body.error).not.toContain("private SQL");
});
