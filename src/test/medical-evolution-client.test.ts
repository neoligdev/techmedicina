// @vitest-environment node
import { it, expect, vi, afterEach } from "vitest";
import { createMedicalEvolutionClient } from "@/features/medical-records/evolution-client";
const viewer = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
  userId: "33333333-3333-4333-8333-333333333333",
};
const command = {
  id: "44444444-4444-4444-8444-444444444444",
  text: "QA fictício",
  supplementsId: null,
};
const result = {
  id: command.id,
  clinicId: viewer.clinicId,
  patientId: viewer.patientId,
  text: command.text,
  author: { userId: viewer.userId, name: "Médico QA", crm: "QA-000", uf: "BA" },
  recordedAt: "2026-10-31T12:00:00.000Z",
  supplementsId: null,
};
function setup() {
  const getSession = vi.fn(async () => ({ userId: viewer.userId, accessToken: "qa-token" }));
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ result }));
  return { getSession, fetcher, client: createMedicalEvolutionClient(viewer, getSession, fetcher) };
}
afterEach(() => vi.useRealTimers());
it("sends one immutable command with no scope/author body and no browser credentials/cache/redirect", async () => {
  const s = setup();
  expect(await s.client.create(command)).toEqual(result);
  expect(s.fetcher).toHaveBeenCalledTimes(1);
  const options = s.fetcher.mock.calls[0]![1]!;
  expect(JSON.parse(options.body as string)).toEqual(command);
  expect(options).toMatchObject({
    method: "POST",
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
  });
});
it("treats transport failure as uncertain and never retries", async () => {
  const s = setup();
  s.fetcher.mockRejectedValue(new Error("network"));
  await expect(s.client.create(command)).rejects.toMatchObject({ outcome: "uncertain" });
  expect(s.fetcher).toHaveBeenCalledTimes(1);
});
it("refuses a token from another user before dispatch", async () => {
  const s = setup();
  s.getSession.mockResolvedValue({
    userId: "55555555-5555-4555-8555-555555555555",
    accessToken: "other",
  });
  await expect(s.client.create(command)).rejects.toMatchObject({ outcome: "rejected" });
  expect(s.fetcher).not.toHaveBeenCalled();
});
it("closing while token lookup is pending prevents dispatch", async () => {
  const s = setup();
  let finish!: (value: { userId: string; accessToken: string }) => void;
  s.getSession.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = s.client.create(command);
  s.client.close();
  finish({ userId: viewer.userId, accessToken: "qa" });
  await expect(pending).rejects.toMatchObject({ outcome: "rejected" });
  expect(s.fetcher).not.toHaveBeenCalled();
});
it("does not release a late write result after the view closed", async () => {
  const s = setup();
  s.fetcher.mockImplementation(async () => {
    s.client.close();
    return Response.json({ result });
  });
  await expect(s.client.create(command)).rejects.toMatchObject({ outcome: "uncertain" });
});
it("rejects a foreign or changed successful response as uncertain", async () => {
  const s = setup();
  s.fetcher.mockResolvedValue(Response.json({ result: { ...result, text: "Changed" } }));
  await expect(s.client.create(command)).rejects.toMatchObject({ outcome: "uncertain" });
});
it("a read-only exact-ID confirmation compares original content and authorship", async () => {
  const s = setup();
  expect((await s.client.confirm(command)).outcome).toBe("confirmed");
  expect(s.fetcher.mock.calls[0]![0]).toBe(`/api/medical/evolutions?id=${command.id}`);
  expect(s.fetcher.mock.calls[0]![1]!.method).toBe("GET");
});
it("404 remains unconfirmed and a different command is a conflict, with no POST", async () => {
  const s = setup();
  s.fetcher.mockResolvedValueOnce(new Response(null, { status: 404 }));
  expect(await s.client.confirm(command)).toEqual({ outcome: "unconfirmed", record: null });
  s.fetcher.mockResolvedValueOnce(
    Response.json({ result: { ...result, text: "Original diferente" } }),
  );
  expect((await s.client.confirm(command)).outcome).toBe("conflict");
  expect(s.fetcher.mock.calls.every((v) => v[1]!.method === "GET")).toBe(true);
});
it("a lookup timeout also covers pending session resolution and prevents later dispatch", async () => {
  vi.useFakeTimers();
  const s = setup();
  let finish!: (value: { userId: string; accessToken: string }) => void;
  s.getSession.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = s.client.create(command);
  const assertion = expect(pending).rejects.toMatchObject({ outcome: "rejected" });
  await vi.advanceTimersByTimeAsync(20001);
  await assertion;
  finish({ userId: viewer.userId, accessToken: "qa" });
  await Promise.resolve();
  expect(s.fetcher).not.toHaveBeenCalled();
});
it("a dispatched write deadline stays uncertain even if the response arrives later", async () => {
  vi.useFakeTimers();
  const s = setup();
  let finish!: (value: Response) => void;
  s.fetcher.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = s.client.create(command);
  const assertion = expect(pending).rejects.toMatchObject({ outcome: "uncertain" });
  await vi.advanceTimersByTimeAsync(20001);
  await assertion;
  finish(Response.json({ result }));
  await Promise.resolve();
  expect(s.fetcher).toHaveBeenCalledTimes(1);
});
it("closing aborts an already dispatched request without assuming rollback", async () => {
  const s = setup();
  let signal: AbortSignal | undefined;
  s.fetcher.mockImplementation(async (_url, options) => {
    signal = options?.signal as AbortSignal;
    s.client.close();
    throw new Error("aborted");
  });
  await expect(s.client.create(command)).rejects.toMatchObject({ outcome: "uncertain" });
  expect(signal?.aborted).toBe(true);
});
it("captures the original command before awaited token resolution", async () => {
  const s = setup(),
    mutable = { ...command };
  s.getSession.mockImplementation(async () => {
    mutable.text = "Changed while awaiting";
    return { userId: viewer.userId, accessToken: "qa" };
  });
  await s.client.create(mutable);
  expect(JSON.parse(s.fetcher.mock.calls[0]![1]!.body as string)).toEqual(command);
});
it("reads a bounded history page with structured cursor and no writes", async () => {
  const s = setup();
  s.fetcher.mockImplementation(async () =>
    Response.json({ result: { items: [result], nextCursor: null } }),
  );
  expect((await s.client.history()).items).toEqual([result]);
  expect(s.fetcher.mock.calls[0]![1]!.method).toBe("GET");
  await expect(s.client.history({ recordedAt: result.recordedAt, id: result.id })).rejects.toThrow(
    "order",
  );
});
it("does not accept a history page containing another patient", async () => {
  const s = setup();
  s.fetcher.mockResolvedValue(
    Response.json({
      result: {
        items: [{ ...result, patientId: "55555555-5555-4555-8555-555555555555" }],
        nextCursor: null,
      },
    }),
  );
  await expect(s.client.history()).rejects.toThrow("Unexpected medical result");
});
