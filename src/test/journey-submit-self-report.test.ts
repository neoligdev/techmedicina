import { expect, it, vi } from "vitest";
import { submitJourneySelfReport } from "../lib/journey/submit-self-report.server";
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
it("envia clínica do contexto e retorna apenas recibo confirmado", async () => {
  const rpc = vi.fn().mockResolvedValue(row);
  const receipt = await submitJourneySelfReport(context, input, rpc);
  expect(rpc).toHaveBeenCalledWith({
    p_clinic_id: clinic,
    p_goal_id: id,
    p_source_event_id: id,
    p_occurred_at: input.occurredAt,
  });
  expect(receipt).toMatchObject({ clinicId: clinic, patientId: patient, goalId: id });
  expect(receipt).not.toHaveProperty("actorUserId");
});
it("sem grant ou papel paciente não chega à RPC", async () => {
  const rpc = vi.fn();
  await expect(
    submitJourneySelfReport(
      { ...context, identity: { userId: patient, globalRole: "super_admin", links: [] } },
      input,
      rpc,
    ),
  ).rejects.toMatchObject({ status: 403 });
  expect(rpc).not.toHaveBeenCalled();
});
it("IDs de clínica enviados pelo cliente são recusados", async () => {
  const rpc = vi.fn();
  await expect(
    submitJourneySelfReport(context, { ...input, clinicId: clinic }, rpc),
  ).rejects.toMatchObject({ status: 400 });
  expect(rpc).not.toHaveBeenCalled();
});
it.each(["clinic_id", "patient_id", "actor_user_id", "goal_id", "source_event_id"])(
  "resposta com %s trocado não confirma",
  async (field) => {
    await expect(
      submitJourneySelfReport(context, input, async () => ({
        ...row,
        [field]: "00000000-0000-4000-8000-000000000009",
      })),
    ).rejects.toThrow("Unconfirmed self-report");
  },
);
