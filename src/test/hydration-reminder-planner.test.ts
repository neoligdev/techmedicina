// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { createHydrationReminderPlanner } from "@/lib/hydration/reminder-planner.server";
import { hydrationReminderSlot } from "@/features/hydration/reminder-slot";
const clinicId = "11111111-1111-4111-8111-111111111111",
  patientId = "22222222-2222-4222-8222-222222222222";
function setup() {
  const preference = {
    clinicId,
    patientId,
    revision: 3,
    settings: {
      dailyGoalMl: null,
      timeZone: "UTC",
      remindersEnabled: true,
      reminderTimes: ["09:00"],
    },
  };
  const job = {
    id: "33333333-3333-4333-8333-333333333333",
    clinicId,
    patientId,
    preferencesRevision: 2,
    slotKey: hydrationReminderSlot(preference, "2026-10-31T09:00:00Z")!.key,
    scheduledAt: "2026-10-31T09:00:00Z",
    expiresAt: "2026-10-31T09:01:00Z",
    revision: 1,
    status: "queued",
    attemptId: null,
    providerReceiptId: null,
    reason: null,
  };
  const providers = {
    now: vi.fn(() => "2026-10-31T09:00:10Z"),
    list: vi.fn(async () => ({ items: [preference], nextCursor: null as string | null })),
    enqueue: vi.fn(
      async (_request: { id: string; clinicId: string; patientId: string; scheduledAt: string }) =>
        job,
    ),
    newJobId: () => "44444444-4444-4444-8444-444444444444",
  };
  return { preference, job, providers, run: createHydrationReminderPlanner(providers) };
}
describe("bounded private reminder planner", () => {
  it("normalizes the minute and accepts the existing SQL occurrence on retry", async () => {
    const s = setup();
    expect(await s.run()).toEqual({ scanned: 1, planned: 1, next: null });
    await s.run();
    expect(s.providers.enqueue.mock.calls[0]![0]).toMatchObject({
      scheduledAt: "2026-10-31T09:00:00.000Z",
      clinicId,
      patientId,
    });
  });
  it("does not infer reminders outside configured times", async () => {
    const s = setup();
    s.preference.settings.reminderTimes = ["10:00"];
    expect((await s.run()).planned).toBe(0);
    expect(s.providers.enqueue).not.toHaveBeenCalled();
  });
  it("validates the entire page before any write", async () => {
    const s = setup();
    s.providers.list.mockResolvedValue({ items: [s.preference, s.preference], nextCursor: null });
    await expect(s.run()).rejects.toThrow();
    expect(s.providers.enqueue).not.toHaveBeenCalled();
  });
  it("rejects a fabricated continuation cursor", async () => {
    const s = setup();
    s.providers.list.mockResolvedValue({
      items: [s.preference],
      nextCursor: `${clinicId}:${patientId}`,
    });
    await expect(s.run()).rejects.toThrow();
    expect(s.providers.enqueue).not.toHaveBeenCalled();
  });
  it("rejects expired checkpoints before reading", async () => {
    const s = setup();
    await expect(s.run({ minute: "2026-10-31T08:59:00.000Z", after: null })).rejects.toThrow();
    expect(s.providers.list).not.toHaveBeenCalled();
  });
  it("does not write after a slow candidate read crosses the minute", async () => {
    const s = setup();
    s.providers.now
      .mockReturnValueOnce("2026-10-31T09:00:10Z")
      .mockReturnValue("2026-10-31T09:01:00Z");
    await expect(s.run()).rejects.toThrow();
    expect(s.providers.enqueue).not.toHaveBeenCalled();
  });
  it("rejects a foreign occurrence returned by enqueue", async () => {
    const s = setup();
    s.job.patientId = "55555555-5555-4555-8555-555555555555";
    await expect(s.run()).rejects.toThrow();
  });
  it("does not turn an uncertain write into an advanced checkpoint", async () => {
    const s = setup();
    s.providers.enqueue.mockRejectedValue(new Error("lost response"));
    await expect(s.run()).rejects.toThrow("lost response");
  });
});

it("returns a checkpoint only after a full ordered batch and resumes strictly after it", async () => {
  const s = setup();
  const items = Array.from({ length: 100 }, (_, i) => ({
    ...s.preference,
    patientId: `22222222-2222-4222-8222-${String(i).padStart(12, "0")}`,
    settings: { ...s.preference.settings, remindersEnabled: false },
  }));
  const cursor = `${clinicId}:${items[99]!.patientId}`;
  s.providers.list
    .mockResolvedValueOnce({ items, nextCursor: cursor })
    .mockResolvedValueOnce({ items: [], nextCursor: null });
  const result = await s.run();
  expect(result).toEqual({
    scanned: 100,
    planned: 0,
    next: { minute: "2026-10-31T09:00:00.000Z", after: cursor },
  });
  expect(await s.run(result.next)).toEqual({ scanned: 0, planned: 0, next: null });
  expect(s.providers.enqueue).not.toHaveBeenCalled();
});
it("rejects candidates at or before the continuation key", async () => {
  const s = setup();
  await expect(
    s.run({ minute: "2026-10-31T09:00:00.000Z", after: `${clinicId}:${patientId}` }),
  ).rejects.toThrow("Unordered");
  expect(s.providers.enqueue).not.toHaveBeenCalled();
});
