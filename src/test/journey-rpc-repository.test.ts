import { expect, it, vi } from "vitest";
import { createJourneyRpcRepository } from "../lib/journey/rpc-repository.server";
const clinic = "00000000-0000-4000-8000-000000000001";
const patient = "00000000-0000-4000-8000-000000000002";
const context = { currentClinicId: clinic, identity: { userId: patient, links: [] } };
const goal = {
  id: patient,
  clinic_id: clinic,
  patient_id: patient,
  patient_user_id: patient,
  version: 1,
  policy_version_id: patient,
  kind: "hydration",
  cadence: "daily",
  status: "eligible",
  effective_from: "2026-10-13T00:00:00Z",
  expires_at: null,
};
it("leitura envia a clínica do contexto e valida associação retornada", async () => {
  const transport = vi.fn().mockResolvedValue({
    data: { goal, patientLink: { clinicId: clinic, patientId: patient, isActive: true } },
    error: null,
  });
  const { repository } = createJourneyRpcRepository(transport);
  expect(await repository.read(context, patient)).toMatchObject({ goal });
  expect(transport).toHaveBeenCalledWith("tm_get_journey_goal_for_doctor", {
    p_goal_id: patient,
    p_clinic_id: clinic,
  });
  transport.mockResolvedValue({
    data: { goal, patientLink: { clinicId: patient, patientId: patient, isActive: true } },
    error: null,
  });
  await expect(repository.read(context, patient)).rejects.toThrow("Unexpected goal scope");
});
it.each([
  ["40001", 409],
  ["42501", 403],
  ["22023", 400],
])("erro SQL %s mantém classificação sem detalhes", async (code, status) => {
  const { preferenceRpc } = createJourneyRpcRepository(async () => ({
    data: null,
    error: { code: String(code) },
  }));
  await expect(
    preferenceRpc("tm_get_journey_preference", { p_patient_id: patient }),
  ).rejects.toMatchObject({ status });
});
it("falha desconhecida não transforma dados em sucesso", async () => {
  const { repository } = createJourneyRpcRepository(async () => ({
    data: goal,
    error: { code: "XX000" },
  }));
  await expect(
    repository.pause(context, { p_goal_id: patient, p_expected_version: 1 }),
  ).rejects.toThrow("Journey unavailable");
});
