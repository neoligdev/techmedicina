import { expect, it, vi } from "vitest";
import { createJourneyGoalPauseHandler } from "../lib/journey/goal-pause-handler.server";
import type { AuthContext } from "../lib/auth/core";
const clinic = "00000000-0000-4000-8000-000000000001",
  patient = "00000000-0000-4000-8000-000000000002",
  goal = "00000000-0000-4000-8000-000000000003";
const context: AuthContext = {
  currentClinicId: clinic,
  identity: {
    userId: goal,
    links: [
      {
        clinicId: clinic,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: [
          { resource: "journey_goals", action: "read" },
          { resource: "journey_goals", action: "write" },
        ],
      },
    ],
  },
};
const row = {
  id: goal,
  clinic_id: clinic,
  patient_id: patient,
  patient_user_id: patient,
  version: 1,
  policy_version_id: goal,
  kind: "sleep",
  cadence: "daily",
  status: "eligible",
  effective_from: "2026-10-13T00:00:00+00:00",
  expires_at: null,
};
const url = "https://clinica.qa.test/api/journey/goals/pause";
function request(
  body = JSON.stringify({ goalId: goal, expectedVersion: 1 }),
  type = "application/json",
) {
  return new Request(url, { method: "POST", headers: { "content-type": type }, body });
}
function setup() {
  const repository = {
    read: vi.fn().mockResolvedValue({
      goal: row,
      patientLink: { clinicId: clinic, patientId: patient, isActive: true },
    }),
    pause: vi.fn().mockResolvedValue({ ...row, status: "paused", version: 2 }),
  };
  return {
    repository,
    handler: createJourneyGoalPauseHandler(async () => ({ context, repository })),
  };
}
it("retorna confirmação mínima sem cache e não expõe dados da meta", async () => {
  const { handler } = setup();
  const response = await handler(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    goal: { goalId: goal, clinicId: clinic, patientId: patient, status: "paused", version: 2 },
  });
});
it.each([
  ["{", "application/json", 400],
  [
    JSON.stringify({ goalId: goal, expectedVersion: 1, actorUserId: patient }),
    "application/json",
    400,
  ],
  ["x".repeat(4097), "application/json", 413],
  ["{}", "text/plain", 415],
])("não consulta banco com payload inválido", async (body, type, status) => {
  const { handler, repository } = setup();
  expect((await handler(request(body as string, type as string))).status).toBe(status);
  expect(repository.read).not.toHaveBeenCalled();
  expect(repository.pause).not.toHaveBeenCalled();
});
it("sessão ausente, query inesperada e método errado não chegam ao repositório", async () => {
  const resolve = vi.fn().mockResolvedValue(null);
  const handler = createJourneyGoalPauseHandler(resolve);
  expect((await handler(request())).status).toBe(401);
  resolve.mockClear();
  expect((await handler(new Request(url + "?clinicId=" + clinic, { method: "POST" }))).status).toBe(
    400,
  );
  const get = await handler(new Request(url));
  expect(get.status).toBe(405);
  expect(get.headers.get("allow")).toBe("POST");
  expect(resolve).not.toHaveBeenCalled();
});
it("paciente não consulta metadados nem grava suspensão", async () => {
  const { repository } = setup();
  const handler = createJourneyGoalPauseHandler(async () => ({
    context: {
      ...context,
      identity: {
        ...context.identity,
        links: [{ ...context.identity.links[0]!, role: "paciente" }],
      },
    },
    repository,
  }));
  expect((await handler(request())).status).toBe(403);
  expect(repository.read).not.toHaveBeenCalled();
});
it("conflito de versão retorna 409 e erro interno não vaza detalhes", async () => {
  const { handler, repository } = setup();
  expect(
    (await handler(request(JSON.stringify({ goalId: goal, expectedVersion: 2 })))).status,
  ).toBe(409);
  repository.pause.mockRejectedValue(new Error("private database detail"));
  const response = await handler(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private database");
});
