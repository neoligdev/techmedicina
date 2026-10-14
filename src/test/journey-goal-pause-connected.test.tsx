import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { createJourneyGoalReadHandler } from "../lib/journey/goal-read-handler.server";
import { afterEach, expect, it, vi } from "vitest";
import { JourneyGoalPauseConnectedCard } from "../features/journey/goal-pause-connected-card";
import { createJourneyGoalPauseHandler } from "../lib/journey/goal-pause-handler.server";
import type { AuthContext } from "../lib/auth/core";
import type { JourneyGoalView } from "../features/journey/goal-pause";
afterEach(cleanup);
it("conflito exige recarga HTTP da versão atual antes da suspensão médica", async () => {
  const clinicId = "00000000-0000-4000-8000-000000000001",
    patientId = "00000000-0000-4000-8000-000000000002",
    goalId = "00000000-0000-4000-8000-000000000003";
  const goal: JourneyGoalView = {
    goalId,
    clinicId,
    patientId,
    title: "Hidratação",
    status: "eligible",
    version: 1,
  };
  const context: AuthContext = {
    currentClinicId: clinicId,
    identity: {
      userId: goalId,
      links: [
        {
          clinicId,
          role: "medico",
          isActive: true,
          medicalIdentityVerified: true,
          grants: [
            { resource: "journey_goals", action: "read" },
            { resource: "journey_goals", action: "write" },
          ],
        },
      ],
    },
  };
  const row = {
    id: goalId,
    clinic_id: clinicId,
    patient_id: patientId,
    patient_user_id: patientId,
    version: 2,
    policy_version_id: goalId,
    kind: "hydration",
    cadence: "daily",
    status: "eligible",
    effective_from: "2026-10-13T00:00:00+00:00",
    expires_at: null,
  };
  const repository = {
    read: vi
      .fn()
      .mockResolvedValue({ goal: row, patientLink: { clinicId, patientId, isActive: true } }),
    pause: vi.fn().mockResolvedValue({ ...row, status: "paused", version: 3 }),
  };
  const handler = createJourneyGoalPauseHandler(async (request) =>
    request.headers.get("authorization") === "Bearer local-test-session"
      ? { context, repository }
      : null,
  );
  const readHandler = createJourneyGoalReadHandler(async (request) =>
    request.headers.get("authorization") === "Bearer local-test-session"
      ? { context, read: repository.read }
      : null,
  );
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(new URL(String(input), "https://clinica.qa.test"), init);
    return request.method === "GET" ? readHandler(request) : handler(request);
  };
  render(
    <JourneyGoalPauseConnectedCard
      goal={goal}
      canPause
      getAccessToken={async () => "local-test-session"}
      fetcher={fetcher}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Suspender meta" }));
  expect(repository.pause).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar suspensão" }));
  await screen.findByText(/mudou em outra sessão/);
  expect(repository.pause).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Recarregar meta" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Suspender meta" })).not.toBeDisabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Suspender meta" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar suspensão" }));
  await screen.findByText("Meta suspensa. Registros anteriores preservados.");
  expect(repository.pause).toHaveBeenCalledWith(context, {
    p_goal_id: goalId,
    p_expected_version: 2,
  });
  expect(screen.getByText("Estado confirmado: suspensa")).toBeInTheDocument();
});
