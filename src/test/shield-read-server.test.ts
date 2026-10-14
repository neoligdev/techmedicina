import { expect, it, vi } from "vitest";
import { readOwnShields } from "@/lib/journey/shield-read.server";
import type { AuthContext } from "@/lib/auth/core";
import { SHIELD_TIERS } from "@/features/journey/contracts";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222";
const context: AuthContext = {
  currentClinicId: clinic,
  identity: {
    userId: "33333333-3333-4333-8333-333333333333",
    links: [
      {
        clinicId: clinic,
        patientId: patient,
        role: "paciente",
        isActive: true,
        grants: [{ resource: "journey_shields", action: "read" }],
      },
    ],
  },
};
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
it("returns only a validated own overview", async () => {
  await expect(readOwnShields(context, async () => overview)).resolves.toEqual(overview);
});
it("rejects foreign state even when top-level scope matches", async () => {
  await expect(
    readOwnShields(context, async () => ({
      ...overview,
      state: { ...overview.state, patientId: clinic },
    })),
  ).rejects.toThrow("Unexpected shield scope");
});
it("derives own scope from patient link rather than Auth user ID", async () => {
  const read = vi.fn().mockResolvedValue(null);
  await expect(readOwnShields(context, read)).rejects.toThrow();
  expect(read).toHaveBeenCalledWith(clinic, patient);
});
it("global administrator cannot bypass missing patient link", async () => {
  const read = vi.fn();
  await expect(
    readOwnShields(
      {
        currentClinicId: clinic,
        identity: { ...context.identity, globalRole: "super_admin", links: [] },
      },
      read,
    ),
  ).rejects.toMatchObject({ status: 403 });
  expect(read).not.toHaveBeenCalled();
});
it.each(["medico", "admin"] as const)("rejects role %s before repository", async (role) => {
  const read = vi.fn();
  const link = context.identity.links[0]!;
  await expect(
    readOwnShields(
      { ...context, identity: { ...context.identity, links: [{ ...link, role }] } },
      read,
    ),
  ).rejects.toMatchObject({ status: 403 });
  expect(read).not.toHaveBeenCalled();
});
it("requires explicit shield read grant and unique active link", async () => {
  const read = vi.fn();
  const link = context.identity.links[0]!;
  for (const links of [[{ ...link, grants: [] }], [link, link], [{ ...link, isActive: false }]]) {
    await expect(
      readOwnShields({ ...context, identity: { ...context.identity, links } }, read),
    ).rejects.toMatchObject({ status: 403 });
  }
  expect(read).not.toHaveBeenCalled();
});
