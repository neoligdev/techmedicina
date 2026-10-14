import { expect, it, vi } from "vitest";
import { readJourneyPreference, saveJourneyPreference } from "../lib/journey/preferences.server";
import type { AuthContext } from "../lib/auth/core";
const clinic = "00000000-0000-4000-8000-000000000001";
const patient = "00000000-0000-4000-8000-000000000002";
const user = "00000000-0000-4000-8000-000000000003";
const context: AuthContext = {
  currentClinicId: clinic,
  identity: {
    userId: user,
    links: [
      {
        clinicId: clinic,
        patientId: patient,
        role: "paciente",
        isActive: true,
        grants: [{ resource: "journey_events", action: "create" }],
      },
    ],
  },
};
const input = { patientId: patient, isEnabled: true, expectedRevision: 1 };
const row = {
  clinic_id: clinic,
  patient_id: patient,
  patient_user_id: user,
  is_enabled: true,
  revision: 2,
};
it("envia somente argumentos permitidos e retorna resposta validada", async () => {
  const rpc = vi.fn().mockResolvedValue(row);
  expect(await saveJourneyPreference(context, input, rpc)).toEqual({
    clinicId: clinic,
    patientId: patient,
    isEnabled: true,
    revision: 2,
  });
  expect(rpc).toHaveBeenCalledWith("tm_set_journey_preference", {
    p_patient_id: patient,
    p_is_enabled: true,
    p_expected_revision: 1,
  });
});
it.each([
  { ...row, clinic_id: user },
  { ...row, patient_id: user },
  { ...row, patient_user_id: patient },
  { ...row, revision: 5 },
  { ...row, is_enabled: false },
  { ...row, points: 100 },
])("recusa resposta alheia, incoerente ou não contratada", async (invalid) => {
  await expect(
    saveJourneyPreference(context, input, vi.fn().mockResolvedValue(invalid)),
  ).rejects.toThrow();
});
it("nega host ausente, outro paciente, administrador e vínculo inativo antes do RPC", async () => {
  for (const invalid of [
    { ...context, currentClinicId: undefined },
    { ...context, currentClinicId: user },
    {
      ...context,
      identity: {
        ...context.identity,
        links: [{ ...context.identity.links[0]!, role: "admin" as const }],
      },
    },
    {
      ...context,
      identity: {
        ...context.identity,
        links: [{ ...context.identity.links[0]!, isActive: false }],
      },
    },
  ]) {
    const rpc = vi.fn();
    await expect(saveJourneyPreference(invalid, input, rpc)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  }
  const rpc = vi.fn();
  await expect(
    saveJourneyPreference(context, { ...input, patientId: user }, rpc),
  ).rejects.toThrow();
  expect(rpc).not.toHaveBeenCalled();
});
it("sem grant permite desligar, mas recusa habilitar", async () => {
  const noGrant = {
    ...context,
    identity: { ...context.identity, links: [{ ...context.identity.links[0]!, grants: [] }] },
  };
  const rpc = vi.fn().mockResolvedValue({ ...row, is_enabled: false });
  await expect(saveJourneyPreference(noGrant, input, rpc)).rejects.toThrow();
  expect(rpc).not.toHaveBeenCalled();
  expect(await saveJourneyPreference(noGrant, { ...input, isEnabled: false }, rpc)).toMatchObject({
    isEnabled: false,
  });
});
it("rejeita payload com contexto forjado antes do RPC", async () => {
  const rpc = vi.fn();
  await expect(
    saveJourneyPreference(context, { ...input, clinicId: clinic }, rpc),
  ).rejects.toThrow();
  expect(rpc).not.toHaveBeenCalled();
});
it("lê preferência inicial desligada e valida vínculo da resposta", async () => {
  const rpc = vi.fn().mockResolvedValue({ ...row, is_enabled: false, revision: 0 });
  expect(await readJourneyPreference(context, patient, rpc)).toMatchObject({
    isEnabled: false,
    revision: 0,
  });
  expect(rpc).toHaveBeenCalledWith("tm_get_journey_preference", { p_patient_id: patient });
  rpc.mockResolvedValue({ ...row, revision: 0 });
  await expect(readJourneyPreference(context, patient, rpc)).rejects.toThrow();
  rpc.mockResolvedValue({ ...row, clinic_id: user });
  await expect(readJourneyPreference(context, patient, rpc)).rejects.toThrow();
});
