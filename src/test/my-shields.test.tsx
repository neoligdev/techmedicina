import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MyShields } from "@/features/journey/my-shields";
import { SHIELD_TIERS } from "@/features/journey/contracts";
afterEach(cleanup);
const clinicId = "11111111-1111-4111-8111-111111111111",
  patientId = "22222222-2222-4222-8222-222222222222";
const state = {
  clinicId,
  patientId,
  activeShield: "origem",
  highestShieldEarned: "ritmo",
  isProvisional: false,
  scoreAverage: 20,
  scoreAverageRounded: 20,
  evaluableDaysCount: 7,
  consecutiveLowDays: 3,
  lastEvaluatedDate: "2026-10-14",
  evaluatedAt: "2026-10-14T12:00:00Z",
  rulesVersion: "v0.11.3",
  recentAction: "regression",
  reason: "QA",
};
const event = {
  id: clinicId,
  clinicId,
  patientId,
  action: "promotion",
  shield: "ritmo",
  previousShield: "origem",
  highestShieldEarned: "ritmo",
  evaluatedDate: "2026-10-10",
  occurredAt: "2026-10-10T12:00:00Z",
  scoreAverage: 40,
  evaluableDaysCount: 7,
  consecutiveLowDays: 0,
  vitalitySnapshot: null,
  rulesVersion: "v0.11.3",
  reason: "QA",
};
const overview = {
  clinicId,
  patientId,
  state,
  history: [event],
  tierInfo: SHIELD_TIERS.origem,
  nextTier: SHIELD_TIERS.ritmo,
  progress: {
    currentRank: 1,
    nextTierId: "ritmo",
    nextTierName: "Ritmo",
    nextTierMinScore: 30,
    pointsNeededToNextTier: 10,
    progressPercentage: 66,
    daysRemainingInWindow: 0,
    consecutiveLowDays: 3,
    isAtRiskOfRegression: false,
  },
};
it("keeps past conquest after regression with timezone and progress", () => {
  render(<MyShields overview={overview} clinicId={clinicId} patientId={patientId} />);
  expect(screen.getByText("Escudo ativo: Origem")).toBeInTheDocument();
  expect(screen.getByText("Conquistado")).toBeInTheDocument();
  expect(screen.getByText(/10\/10\/2026.*09:00.*America\/Bahia/)).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "66");
  expect(screen.getAllByText("VITALIDADE: indisponível/não calculada.")).toHaveLength(2);
});
it.each([
  { ...overview, patientId: clinicId },
  { ...overview, state: { ...state, clinicId: patientId } },
  { ...overview, history: [{ ...event, patientId: clinicId }] },
])("rejects foreign scope at every level", (payload) => {
  render(<MyShields overview={payload} clinicId={clinicId} patientId={patientId} />);
  expect(screen.queryByText("JORNADA: 40")).not.toBeInTheDocument();
  expect(screen.getByText(/Nenhum histórico autorizado/)).toBeInTheDocument();
});
it("provisional state shows no invented progress", () => {
  render(
    <MyShields
      overview={{
        ...overview,
        state: { ...state, isProvisional: true, scoreAverage: null, scoreAverageRounded: null },
      }}
      clinicId={clinicId}
      patientId={patientId}
    />,
  );
  expect(screen.getByText("JORNADA: indisponível")).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
it("does not assign scores or achievements without authorized data", () => {
  render(<MyShields />);
  expect(screen.getByRole("heading", { name: "Meus Escudos" })).toBeInTheDocument();
  expect(screen.getByText(/Nenhum histórico autorizado/)).toBeInTheDocument();
  expect(screen.queryByText(/Escudo ativo:/)).not.toBeInTheDocument();
});
it("rejects malformed payload before showing data", () => {
  render(<MyShields overview={{ clinicId: "other", state: { scoreAverage: 95 } }} />);
  expect(screen.getByText(/Nenhum histórico autorizado/)).toBeInTheDocument();
  expect(screen.queryByText(/95 pontos/)).not.toBeInTheDocument();
});
