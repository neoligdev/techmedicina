import { expect, it, vi } from "vitest";
import { createOwnShieldClient } from "@/features/journey/shield-client";
import { SHIELD_TIERS } from "@/features/journey/contracts";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222";
const overview = {
  clinicId: clinic,
  patientId: patient,
  state: {
    clinicId: clinic,
    patientId: patient,
    activeShield: "origem",
    highestShieldEarned: "origem",
    isProvisional: true,
    scoreAverage: null,
    scoreAverageRounded: null,
    evaluableDaysCount: 0,
    consecutiveLowDays: 0,
    lastEvaluatedDate: null,
    evaluatedAt: "2026-10-14T12:00:00Z",
    rulesVersion: "v0.11.3",
    recentAction: "initial",
    reason: "QA",
  },
  history: [],
  tierInfo: SHIELD_TIERS.origem,
  nextTier: SHIELD_TIERS.ritmo,
  progress: {
    currentRank: 1,
    nextTierId: "ritmo",
    nextTierName: "Ritmo",
    nextTierMinScore: 30,
    pointsNeededToNextTier: 30,
    progressPercentage: 0,
    daysRemainingInWindow: 7,
    consecutiveLowDays: 0,
    isAtRiskOfRegression: false,
  },
};
it("fresh bearer per read, no query identifiers/cache/cookies", async () => {
  const tokens = vi.fn().mockResolvedValueOnce("one").mockResolvedValueOnce("two");
  const fetcher = vi.fn(async () => Response.json({ overview }));
  const read = createOwnShieldClient(
    { clinicId: clinic, patientId: patient, getAccessToken: tokens },
    fetcher,
  );
  await expect(read()).resolves.toEqual(overview);
  await read();
  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/journey/shields",
    expect.objectContaining({
      method: "GET",
      headers: { Authorization: "Bearer two" },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    }),
  );
});
it.each([
  { ...overview, clinicId: patient },
  { ...overview, state: { ...overview.state, patientId: clinic } },
])("rejects foreign overview", async (value) => {
  const read = createOwnShieldClient(
    { clinicId: clinic, patientId: patient, getAccessToken: async () => "qa" },
    vi.fn(async () => Response.json({ overview: value })),
  );
  await expect(read()).rejects.toThrow("Unexpected shield scope");
});
it("missing session never fetches", async () => {
  const fetcher = vi.fn();
  const read = createOwnShieldClient(
    { clinicId: clinic, patientId: patient, getAccessToken: async () => null },
    fetcher,
  );
  await expect(read()).rejects.toThrow("Session required");
  expect(fetcher).not.toHaveBeenCalled();
});
it("deadline covers blocked session lookup", async () => {
  vi.useFakeTimers();
  try {
    const fetcher = vi.fn();
    const read = createOwnShieldClient(
      { clinicId: clinic, patientId: patient, getAccessToken: () => new Promise(() => {}) },
      fetcher,
    );
    const failure = expect(read()).rejects.toThrow("Journey request expired");
    await vi.advanceTimersByTimeAsync(20000);
    await failure;
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
