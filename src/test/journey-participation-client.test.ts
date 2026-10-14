import { afterEach, expect, it, vi } from "vitest";
afterEach(() => vi.useRealTimers());
import { createJourneyParticipationClient } from "../features/journey/participation-client";
const clinicId = "00000000-0000-4000-8000-000000000001",
  patientId = "00000000-0000-4000-8000-000000000002";
const value = { preference: { clinicId, patientId, isEnabled: false, revision: 1 } };
it("limita rede sem resposta e cancela a requisição", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
  const client = createJourneyParticipationClient(
    { clinicId, patientId, getAccessToken: async () => "local-test-session" },
    fetcher,
  );
  const result = expect(client.read()).rejects.toThrow("expired");
  await vi.advanceTimersByTimeAsync(20000);
  await result;
  expect(fetcher.mock.calls[0]![1].signal.aborted).toBe(true);
});
it("limita também resposta cujo corpo nunca termina", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValue({ status: 200, ok: true, json: () => new Promise(() => {}) });
  const client = createJourneyParticipationClient(
    { clinicId, patientId, getAccessToken: async () => "local-test-session" },
    fetcher,
  );
  const result = expect(client.read()).rejects.toThrow("expired");
  await vi.advanceTimersByTimeAsync(20000);
  await result;
});
it("sessão obtida após expirar não inicia uma requisição tardia", async () => {
  vi.useFakeTimers();
  let resolveToken: (value: string) => void = () => {};
  const fetcher = vi.fn();
  const client = createJourneyParticipationClient(
    {
      clinicId,
      patientId,
      getAccessToken: () =>
        new Promise((resolve) => {
          resolveToken = resolve;
        }),
    },
    fetcher,
  );
  const result = expect(client.read()).rejects.toThrow("expired");
  await vi.advanceTimersByTimeAsync(20000);
  await result;
  resolveToken("local-test-session");
  await Promise.resolve();
  expect(fetcher).not.toHaveBeenCalled();
});
it("usa sessão atual e URL relativa, sem cookie/cache/redirecionamento", async () => {
  const token = vi.fn().mockResolvedValue("local-test-session");
  const fetcher = vi.fn().mockImplementation(async () => Response.json(value));
  const client = createJourneyParticipationClient(
    { clinicId, patientId, getAccessToken: token },
    fetcher,
  );
  await client.read();
  expect(fetcher).toHaveBeenCalledWith(
    "/api/journey/participation",
    expect.objectContaining({
      method: "GET",
      cache: "no-store",
      redirect: "error",
      credentials: "omit",
    }),
  );
  await client.read();
  expect(token).toHaveBeenCalledTimes(2);
});
it("sessão ausente e contexto forjado não fazem requisição", async () => {
  const fetcher = vi.fn();
  const client = createJourneyParticipationClient(
    { clinicId, patientId, getAccessToken: async () => null },
    fetcher,
  );
  await expect(client.read()).rejects.toThrow();
  await expect(
    client.save({ patientId, isEnabled: true, expectedRevision: 0, clinicId }),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([
  { ...value, secret: "unexpected" },
  { preference: { ...value.preference, patientId: clinicId } },
  { preference: { ...value.preference, isEnabled: true, revision: 0 } },
])("recusa resposta alheia ou não contratada", async (invalid) => {
  const client = createJourneyParticipationClient(
    { clinicId, patientId, getAccessToken: async () => "local-test-session" },
    vi.fn().mockResolvedValue(Response.json(invalid)),
  );
  await expect(client.read()).rejects.toThrow();
});
