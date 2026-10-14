import { expect, it, vi } from "vitest";
import { createOwnShieldRpcReader } from "@/lib/journey/shield-rpc-reader.server";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  user = "33333333-3333-4333-8333-333333333333";
const row = {
  clinic_id: clinic,
  patient_id: patient,
  patient_user_id: user,
  active_shield: "ritmo",
  highest_shield_earned: "avanco",
  is_provisional: false,
  score_average: 40,
  score_average_rounded: 40,
  evaluable_days_count: 7,
  consecutive_low_days: 0,
  last_evaluated_date: "2026-10-14",
  evaluated_at: "2026-10-14T09:00:00-03:00",
  rules_version: "v0.11.3",
  recent_action: "regression",
  reason: "QA",
  updated_at: "2026-10-14T12:00:00Z",
};
it("maps PostgreSQL state without user metadata and preserves timezone instant", async () => {
  const transport = vi.fn().mockResolvedValue({ data: { state: row, history: [] }, error: null });
  const result = await createOwnShieldRpcReader(user, transport)(clinic, patient);
  expect(result.state.evaluatedAt).toBe("2026-10-14T12:00:00.000Z");
  expect(result.state.activeShield).toBe("ritmo");
  expect(result.state).not.toHaveProperty("patientUserId");
  expect(result.progress.pointsNeededToNextTier).toBe(15);
  expect(transport).toHaveBeenCalledWith("tm_get_patient_shield_overview", {
    p_clinic_id: clinic,
    p_patient_id: patient,
  });
});
it("empty database produces provisional state without conquest or points", async () => {
  const result = await createOwnShieldRpcReader(user, async () => ({
    data: { state: null, history: [] },
    error: null,
  }))(clinic, patient);
  expect(result.state.isProvisional).toBe(true);
  expect(result.state.scoreAverage).toBeNull();
  expect(result.history).toEqual([]);
});
it.each([
  { patient_id: clinic },
  { clinic_id: patient },
  { patient_user_id: patient },
  { injected: true },
])("rejects foreign or unknown fields %j", async (change) => {
  await expect(
    createOwnShieldRpcReader(user, async () => ({
      data: { state: { ...row, ...change }, history: [] },
      error: null,
    }))(clinic, patient),
  ).rejects.toThrow();
});
it("preserves database denial without leaking errors", async () => {
  await expect(
    createOwnShieldRpcReader(user, async () => ({ data: null, error: { code: "42501" } }))(
      clinic,
      patient,
    ),
  ).rejects.toMatchObject({ status: 403 });
});
