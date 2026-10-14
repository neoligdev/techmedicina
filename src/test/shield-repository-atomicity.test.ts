import { expect, it } from "vitest";
import { InMemoryShieldRepository } from "@/features/journey/shield-repository";
import { patientShieldStateSchema, shieldHistoryEventSchema } from "@/features/journey/contracts";
const clinicId = "11111111-1111-4111-8111-111111111111",
  patientId = "22222222-2222-4222-8222-222222222222";
const state = patientShieldStateSchema.parse({
  clinicId,
  patientId,
  activeShield: "origem",
  highestShieldEarned: "origem",
  isProvisional: false,
  scoreAverage: 20,
  scoreAverageRounded: 20,
  evaluableDaysCount: 7,
  consecutiveLowDays: 0,
  lastEvaluatedDate: "2026-10-14",
  evaluatedAt: "2026-10-14T12:00:00Z",
  rulesVersion: "v0.11.3",
  recentAction: "initial",
  reason: "QA",
});
const event = shieldHistoryEventSchema.parse({
  id: clinicId,
  clinicId,
  patientId,
  action: "initial",
  shield: "origem",
  previousShield: null,
  highestShieldEarned: "origem",
  evaluatedDate: "2026-10-14",
  occurredAt: "2026-10-14T12:00:00Z",
  scoreAverage: 20,
  evaluableDaysCount: 7,
  consecutiveLowDays: 0,
  rulesVersion: "v0.11.3",
  reason: "QA",
});
it("invalid event leaves prior state and ledger unchanged and releases lock", async () => {
  const repository = new InMemoryShieldRepository();
  await repository.saveTransition({ clinicId, patientId, state, event });
  const before = repository.exportSnapshot();
  await expect(
    repository.saveTransition({
      clinicId,
      patientId,
      state: { ...state, scoreAverage: 25 },
      event: { ...event, scoreAverage: 101 },
    }),
  ).rejects.toThrow();
  expect(repository.exportSnapshot()).toBe(before);
  await expect(
    repository.saveTransition({ clinicId, patientId, state, event }),
  ).resolves.toBeDefined();
});
it.each(["state", "event"] as const)(
  "foreign %s never contaminates target tenant",
  async (target) => {
    const repository = new InMemoryShieldRepository();
    const before = repository.exportSnapshot();
    await expect(
      repository.saveTransition({
        clinicId,
        patientId,
        state: target === "state" ? { ...state, clinicId: patientId } : state,
        event: target === "event" ? { ...event, patientId: clinicId } : event,
      }),
    ).rejects.toThrow("scope mismatch");
    expect(repository.exportSnapshot()).toBe(before);
    expect(await repository.getState(clinicId, patientId)).toBeNull();
  },
);
