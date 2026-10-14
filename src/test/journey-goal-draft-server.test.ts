import { expect, it, vi } from "vitest";
import { createJourneyGoalDraft } from "../lib/journey/goal-draft.server";
import type { AuthContext } from "../lib/auth/core";
it("write não substitui create para criar proposta", async () => {
  const rpc = vi.fn();
  const identity = {
    ...context.identity,
    links: context.identity.links.map((link) => ({
      ...link,
      grants: link.grants.map((grant) => ({
        ...grant,
        action: grant.action === "create" ? ("write" as const) : grant.action,
      })),
    })),
  };
  await expect(createJourneyGoalDraft({ ...context, identity }, input, rpc)).rejects.toMatchObject({
    status: 403,
  });
  expect(rpc).not.toHaveBeenCalled();
});
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
it("deriva clínica/autor da sessão e devolve recibo de rascunho", async () => {
  const rpc = vi.fn().mockResolvedValue(row);
  const receipt = await createJourneyGoalDraft(context, input, rpc);
  expect(rpc).toHaveBeenCalledWith({
    p_clinic_id: clinic,
    p_patient_id: patient,
    p_source_request_id: patient,
    p_kind: "hydration",
    p_cadence: "weekly",
  });
  expect(receipt.state).toBe("draft");
  expect(receipt).not.toHaveProperty("patient_user_id");
  expect(receipt).not.toHaveProperty("actor_user_id");
});
it("cargo global e médico sem create não chamam banco", async () => {
  const rpc = vi.fn();
  for (const identity of [
    { userId: doctor, globalRole: "super_admin" as const, links: [] },
    {
      ...context.identity,
      links: context.identity.links.map((link) => ({
        ...link,
        grants: link.grants.filter((grant) => grant.action === "read"),
      })),
    },
  ]) {
    await expect(
      createJourneyGoalDraft({ ...context, identity }, input, rpc),
    ).rejects.toMatchObject({ status: 403 });
  }
  expect(rpc).not.toHaveBeenCalled();
});
it.each([
  { ...input, kind: "medication" },
  { ...input, clinicId: clinic },
  { ...input, state: "eligible" },
])("input não autoriza prescrição, tenant ou elegibilidade", async (value) => {
  const rpc = vi.fn();
  await expect(createJourneyGoalDraft(context, value, rpc)).rejects.toMatchObject({ status: 400 });
  expect(rpc).not.toHaveBeenCalled();
});
it.each(["clinic_id", "patient_id", "actor_user_id", "source_request_id"])(
  "retorno com %s trocado não confirma",
  async (field) => {
    await expect(
      createJourneyGoalDraft(context, input, async () => ({
        ...row,
        [field]: "00000000-0000-4000-8000-000000000009",
      })),
    ).rejects.toThrow("Unconfirmed draft");
  },
);
