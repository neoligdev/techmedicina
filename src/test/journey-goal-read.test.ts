import { expect, it, vi } from "vitest";
import { readJourneyGoalForDoctor } from "../lib/journey/goal-read.server";
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
        grants: [{ resource: "journey_goals", action: "read" }],
      },
    ],
  },
};
const record = {
  goal: {
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
  },
  patientLink: { clinicId: clinic, patientId: patient, isActive: true },
};
it("médico com leitura recebe projeção mínima sem dados de política/conta", async () => {
  expect(await readJourneyGoalForDoctor(context, goal, vi.fn().mockResolvedValue(record))).toEqual({
    goalId: goal,
    clinicId: clinic,
    patientId: patient,
    title: "Hidratação",
    status: "eligible",
    version: 1,
  });
});
it("papel paciente, host ausente e médico sem verificação não consultam repositório", async () => {
  for (const invalid of [
    { ...context, currentClinicId: undefined },
    {
      ...context,
      identity: {
        ...context.identity,
        links: [{ ...context.identity.links[0]!, role: "paciente" as const }],
      },
    },
    {
      ...context,
      identity: {
        ...context.identity,
        links: [{ ...context.identity.links[0]!, medicalIdentityVerified: false }],
      },
    },
  ]) {
    const read = vi.fn();
    await expect(readJourneyGoalForDoctor(invalid, goal, read)).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
  }
});
it("vínculo inativo, meta distinta e outra clínica não retornam dados", async () => {
  for (const invalid of [
    { ...record, patientLink: { ...record.patientLink, isActive: false } },
    { ...record, goal: { ...record.goal, id: patient } },
    { ...record, goal: { ...record.goal, clinic_id: goal } },
  ])
    await expect(
      readJourneyGoalForDoctor(context, goal, vi.fn().mockResolvedValue(invalid)),
    ).rejects.toThrow();
});
