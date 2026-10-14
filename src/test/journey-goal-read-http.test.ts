import { expect, it, vi } from "vitest";
import type { AuthContext } from "../lib/auth/core";
import { createJourneyGoalReadHandler } from "../lib/journey/goal-read-handler.server";
import { createJourneyGoalReadClient } from "../features/journey/goal-read-client";
const clinicId = "00000000-0000-4000-8000-000000000001",
  patientId = "00000000-0000-4000-8000-000000000002",
  goalId = "00000000-0000-4000-8000-000000000003";
const context: AuthContext = {
  currentClinicId: clinicId,
  identity: {
    userId: goalId,
    links: [
      {
        clinicId,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: [{ resource: "journey_goals", action: "read" }],
      },
    ],
  },
};
const record = {
  goal: {
    id: goalId,
    clinic_id: clinicId,
    patient_id: patientId,
    patient_user_id: patientId,
    version: 2,
    policy_version_id: goalId,
    kind: "hydration",
    cadence: "daily",
    status: "paused",
    effective_from: "2026-10-13T00:00:00+00:00",
    expires_at: null,
  },
  patientLink: { clinicId, patientId, isActive: true },
};
const url = "https://clinica.qa.test/api/journey/goals";
it("cliente recarrega pelo GET autenticado e recebe projeção mínima", async () => {
  const read = vi.fn().mockResolvedValue(record);
  const handler = createJourneyGoalReadHandler(async (request) =>
    request.headers.get("authorization") === "Bearer local-test-session" ? { context, read } : null,
  );
  const fetcher: typeof fetch = async (input, init) =>
    handler(new Request(new URL(String(input), url), init));
  const client = createJourneyGoalReadClient(
    { clinicId, patientId, getAccessToken: async () => "local-test-session" },
    fetcher,
  );
  expect(await client(goalId)).toEqual({
    goalId,
    clinicId,
    patientId,
    title: "Hidratação",
    status: "paused",
    version: 2,
  });
  expect(read).toHaveBeenCalledWith(context, goalId);
});
it("query inesperada/duplicada e método incorreto não consultam banco", async () => {
  const read = vi.fn();
  const handler = createJourneyGoalReadHandler(async () => ({ context, read }));
  for (const query of [
    "?clinicId=" + clinicId,
    "?goalId=" + goalId + "&goalId=" + goalId,
    "?goalId=bad",
  ])
    expect((await handler(new Request(url + query))).status).toBe(400);
  expect((await handler(new Request(url, { method: "POST" }))).status).toBe(405);
  expect(read).not.toHaveBeenCalled();
});
it("sessão ausente e retorno de outro contexto não expõem meta", async () => {
  expect(
    (await createJourneyGoalReadHandler(async () => null)(new Request(url + "?goalId=" + goalId)))
      .status,
  ).toBe(401);
  const view = {
    goalId,
    clinicId: patientId,
    patientId,
    title: "Meta",
    status: "paused",
    version: 2,
  };
  const client = createJourneyGoalReadClient(
    { clinicId, patientId, getAccessToken: async () => "local-test-session" },
    vi.fn().mockResolvedValue(Response.json({ goal: view })),
  );
  await expect(client(goalId)).rejects.toThrow();
});
