import { expect, it, vi } from "vitest";
import { pauseJourneyGoal } from "../lib/journey/goal-pause.server";
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
  kind: "hydration",
  cadence: "daily",
  status: "eligible",
  effective_from: "2026-10-13T00:00:00+00:00",
  expires_at: null,
};
function repo() {
  return {
    read: vi.fn().mockResolvedValue({
      goal: row,
      patientLink: { clinicId: clinic, patientId: patient, isActive: true },
    }),
    pause: vi.fn().mockResolvedValue({ ...row, status: "paused", version: 2 }),
  };
}
it("suspende com contexto verificado e retorna somente confirmação mínima", async () => {
  const repository = repo();
  expect(await pauseJourneyGoal(context, { goalId: goal, expectedVersion: 1 }, repository)).toEqual(
    { goalId: goal, clinicId: clinic, patientId: patient, status: "paused", version: 2 },
  );
  expect(repository.pause).toHaveBeenCalledWith(context, {
    p_goal_id: goal,
    p_expected_version: 1,
  });
});
it("aceita pausa já existente sem exigir outra alteração de versão", async () => {
  const repository = repo();
  repository.read.mockResolvedValue({
    goal: { ...row, status: "paused", version: 2 },
    patientLink: { clinicId: clinic, patientId: patient, isActive: true },
  });
  repository.pause.mockResolvedValue({ ...row, status: "paused", version: 2 });
  expect(
    await pauseJourneyGoal(context, { goalId: goal, expectedVersion: 2 }, repository),
  ).toMatchObject({ status: "paused", version: 2 });
});
it("nega pacientes, papel global, médico não verificado e grant ausente antes da leitura", async () => {
  for (const link of [
    { ...context.identity.links[0]!, role: "paciente" as const },
    { ...context.identity.links[0]!, role: "admin" as const },
    { ...context.identity.links[0]!, medicalIdentityVerified: false },
    { ...context.identity.links[0]!, grants: [] },
  ]) {
    const repository = repo();
    await expect(
      pauseJourneyGoal(
        { ...context, identity: { ...context.identity, globalRole: "super_admin", links: [link] } },
        { goalId: goal, expectedVersion: 1 },
        repository,
      ),
    ).rejects.toThrow();
    expect(repository.read).not.toHaveBeenCalled();
  }
});
it("meta de outra clínica ou vínculo inativo não chega ao RPC", async () => {
  for (const record of [
    {
      goal: { ...row, clinic_id: goal },
      patientLink: { clinicId: goal, patientId: patient, isActive: true },
    },
    { goal: row, patientLink: { clinicId: clinic, patientId: patient, isActive: false } },
  ]) {
    const repository = repo();
    repository.read.mockResolvedValue(record);
    await expect(
      pauseJourneyGoal(context, { goalId: goal, expectedVersion: 1 }, repository),
    ).rejects.toThrow();
    expect(repository.pause).not.toHaveBeenCalled();
  }
});
it.each([
  { ...row, status: "paused", version: 2, patient_id: goal },
  { ...row, status: "paused", version: 2, policy_version_id: patient },
  { ...row, status: "eligible", version: 2 },
  { ...row, status: "paused", version: 3 },
])("nega resposta que altera contexto, política, estado ou versão", async (invalid) => {
  const repository = repo();
  repository.pause.mockResolvedValue(invalid);
  await expect(
    pauseJourneyGoal(context, { goalId: goal, expectedVersion: 1 }, repository),
  ).rejects.toThrow();
});
it("versão antiga e payload com estado forjado não enviam gravação", async () => {
  for (const input of [
    { goalId: goal, expectedVersion: 2 },
    { goalId: goal, expectedVersion: 1, status: "eligible" },
  ]) {
    const repository = repo();
    await expect(pauseJourneyGoal(context, input, repository)).rejects.toThrow();
    expect(repository.pause).not.toHaveBeenCalled();
  }
});
