import { afterEach, expect, it, vi } from "vitest";
import { createJourneyGoalPauseClient } from "../features/journey/goal-pause-client";
import { JourneyGoalPauseConflict } from "../features/journey/goal-pause";
afterEach(() => vi.useRealTimers());
const clinicId = "00000000-0000-4000-8000-000000000001",
  patientId = "00000000-0000-4000-8000-000000000002",
  goalId = "00000000-0000-4000-8000-000000000003";
const input = { goalId, expectedVersion: 1 },
  receipt = { goalId, clinicId, patientId, status: "paused", version: 2 };
function api(fetcher: typeof fetch) {
  return createJourneyGoalPauseClient(
    { clinicId, patientId, getAccessToken: async () => "local-test-session" },
    fetcher,
  );
}
it("envia só meta/versão com sessão atual e aceita confirmação estrita", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ goal: receipt }));
  expect(await api(fetcher)(input)).toEqual(receipt);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/journey/goals/pause",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify(input),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    }),
  );
});
it.each([
  { ...receipt, patientId: goalId },
  { ...receipt, clinicId: goalId },
  { ...receipt, goalId: patientId },
  { ...receipt, status: "eligible" },
  { ...receipt, version: 3 },
])("rejeita retorno alheio ou incoerente", async (goal) => {
  await expect(api(vi.fn().mockResolvedValue(Response.json({ goal })))(input)).rejects.toThrow();
});
it("conflito retorna erro tipado e campo forjado não chega à rede", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 409 }));
  await expect(api(fetcher)(input)).rejects.toBeInstanceOf(JourneyGoalPauseConflict);
  fetcher.mockClear();
  await expect(api(fetcher)({ ...input, clinicId })).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it("suspensão sem resposta expira com cancelamento", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
  const result = expect(api(fetcher)(input)).rejects.toThrow("expired");
  await vi.advanceTimersByTimeAsync(20000);
  await result;
  expect(fetcher.mock.calls[0]![1].signal.aborted).toBe(true);
});
