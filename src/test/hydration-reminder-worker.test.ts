// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { createHydrationReminderWorker } from "@/lib/hydration/reminder-worker.server";
import { hydrationReminderSlot } from "@/features/hydration/reminder-slot";
import {
  hydrationReminderJobSchema,
  type HydrationReminderJob,
} from "@/features/hydration/reminder-job-contract";
type Providers = Parameters<typeof createHydrationReminderWorker>[0];
const clinicId = "11111111-1111-4111-8111-111111111111",
  patientId = "22222222-2222-4222-8222-222222222222",
  id = "33333333-3333-4333-8333-333333333333",
  attempt = "44444444-4444-4444-8444-444444444444";
function setup() {
  const preferences = {
    clinicId,
    patientId,
    revision: 3,
    settings: {
      dailyGoalMl: null,
      timeZone: "UTC" as const,
      remindersEnabled: true,
      reminderTimes: ["09:00"],
    },
  };
  const policy = {
    preferences,
    registration: {
      id: "55555555-5555-4555-8555-555555555555",
      clinicId,
      patientId,
      active: true,
      consentGranted: true,
    },
  };
  let stored: HydrationReminderJob = {
    id,
    clinicId,
    patientId,
    preferencesRevision: 3,
    slotKey: hydrationReminderSlot(preferences, "2026-10-30T09:00:00Z")!.key,
    scheduledAt: "2026-10-30T09:00:00Z",
    expiresAt: "2026-10-30T09:01:00Z",
    revision: 1,
    status: "queued",
    attemptId: null,
    providerReceiptId: null,
    reason: null,
  };
  const read = vi.fn<Providers["read"]>(async () => structuredClone(stored));
  const claim = vi.fn<Providers["claim"]>(async (expected, attemptId) => {
    if (stored.status !== "queued" || stored.revision !== expected.revision) return null;
    stored = { ...stored, status: "claimed", revision: stored.revision + 1, attemptId };
    return structuredClone(stored);
  });
  const transition = vi.fn<Providers["transition"]>(async (expected, change) => {
    if (stored.revision !== expected.revision || stored.attemptId !== expected.attemptId)
      return null;
    stored = { ...stored, ...change, revision: stored.revision + 1 };
    return structuredClone(stored);
  });
  const authorize = vi.fn<Providers["authorize"]>(async () => structuredClone(policy));
  const send = vi.fn<Providers["send"]>(async () => ({
    status: "accepted",
    receiptId: "opaque-receipt",
  }));
  const now = vi.fn(() => "2026-10-30T09:00:10Z"),
    providers = { read, claim, transition, authorize, send, now, newAttemptId: () => attempt };
  return {
    read,
    claim,
    transition,
    authorize,
    send,
    now,
    providers,
    policy,
    preferences,
    run: createHydrationReminderWorker(providers),
    get stored() {
      return stored;
    },
    set stored(v: HydrationReminderJob) {
      stored = v;
    },
  };
}
describe("Hydration server reminder dispatch reference", () => {
  it("fences before a single generic send and records acceptance without claiming delivery", async () => {
    const f = setup();
    f.send.mockImplementation(async (input) => {
      expect(f.stored.status).toBe("dispatching");
      expect(f.authorize).toHaveBeenCalledTimes(1);
      expect(input).toEqual({
        destinationId: f.policy.registration.id,
        idempotencyKey: id,
        expiresAt: f.stored.expiresAt,
        title: "Lembrete do aplicativo",
        body: "Abra o aplicativo para revisar seus lembretes.",
      });
      expect(JSON.stringify(input)).not.toContain(patientId);
      return { status: "accepted", receiptId: "r1" };
    });
    expect(await f.run(id)).toEqual({ outcome: "accepted" });
    expect(f.stored).toMatchObject({ status: "accepted", revision: 4, providerReceiptId: "r1" });
    expect(f.stored.status).not.toBe("delivered");
    expect(await f.run(id)).toEqual({ outcome: "already_claimed_or_finished" });
    expect(f.send).toHaveBeenCalledTimes(1);
  });
  it("allows only one claimant when two workers race", async () => {
    const f = setup();
    const outcomes = await Promise.all([f.run(id), f.run(id)]);
    expect(outcomes.map((v) => v.outcome).sort()).toEqual(["accepted", "claim_lost"]);
    expect(f.send).toHaveBeenCalledTimes(1);
  });
  it("does not claim early jobs and never sends expired jobs", async () => {
    const early = setup();
    early.now.mockReturnValue("2026-10-30T08:59:59Z");
    expect(await early.run(id)).toEqual({ outcome: "not_due" });
    expect(early.claim).not.toHaveBeenCalled();
    const expired = setup();
    expired.now.mockReturnValue("2026-10-30T09:01:00Z");
    expect(await expired.run(id)).toEqual({ outcome: "expired" });
    expect(expired.send).not.toHaveBeenCalled();
  });
  it("rechecks time after authorization latency", async () => {
    const f = setup();
    f.authorize.mockImplementation(async () => {
      f.now.mockReturnValue("2026-10-30T09:01:00Z");
      return f.policy;
    });
    expect(await f.run(id)).toEqual({ outcome: "expired" });
    expect(f.send).not.toHaveBeenCalled();
  });
  it("cancels after access revocation or failure to verify current authority", async () => {
    for (const unavailable of [false, true]) {
      const f = setup();
      f.authorize.mockImplementation(async () => {
        if (unavailable) throw new Error("private authority backend");
        return null;
      });
      expect(await f.run(id)).toEqual({ outcome: "cancelled" });
      expect(f.send).not.toHaveBeenCalled();
      expect(f.stored.reason).toBe(unavailable ? "authorization_unavailable" : "not_authorized");
    }
  });
  it("refuses foreign destination, withdrawn consent, disabled schedule and changed revision", async () => {
    for (const change of ["patient", "clinic", "consent", "active", "enabled", "revision"]) {
      const f = setup();
      if (change === "patient") f.policy.registration.patientId = clinicId;
      if (change === "clinic") f.policy.preferences.clinicId = patientId;
      if (change === "consent") f.policy.registration.consentGranted = false;
      if (change === "active") f.policy.registration.active = false;
      if (change === "enabled") f.policy.preferences.settings.remindersEnabled = false;
      if (change === "revision") f.policy.preferences.revision = 4;
      expect(await f.run(id)).toEqual({ outcome: "cancelled" });
      expect(f.send).not.toHaveBeenCalled();
    }
  });
  it("does not send if claim or dispatch persistence is uncertain", async () => {
    const claim = setup();
    claim.claim.mockRejectedValueOnce(new Error("db timeout"));
    expect(await claim.run(id)).toEqual({ outcome: "claim_uncertain" });
    expect(claim.send).not.toHaveBeenCalled();
    const fence = setup();
    fence.transition.mockRejectedValueOnce(new Error("commit result lost"));
    expect(await fence.run(id)).toEqual({ outcome: "persistence_uncertain" });
    expect(fence.send).not.toHaveBeenCalled();
  });
  it("never resends a crash-fenced dispatch on the next run", async () => {
    const f = setup();
    f.stored = { ...f.stored, status: "dispatching", revision: 3, attemptId: attempt };
    expect(await f.run(id)).toEqual({ outcome: "already_claimed_or_finished" });
    expect(f.send).not.toHaveBeenCalled();
  });
  it("keeps lost provider responses uncertain with no automatic retry", async () => {
    const f = setup();
    f.send.mockRejectedValue(new Error("response lost after provider acceptance"));
    expect(await f.run(id)).toEqual({ outcome: "uncertain" });
    expect(f.stored.status).toBe("uncertain");
    await f.run(id);
    expect(f.send).toHaveBeenCalledTimes(1);
  });
  it("does not reinterpret a provider delivery claim as verified evidence", async () => {
    const f = setup();
    f.send.mockResolvedValue({ status: "delivered", receiptId: "unverified" });
    expect(await f.run(id)).toEqual({ outcome: "uncertain" });
    expect(f.stored.providerReceiptId).toBeNull();
  });
  it("keeps dispatch fenced if finalization fails after acceptance", async () => {
    const f = setup();
    const transition = f.transition.getMockImplementation()!;
    f.transition.mockImplementation(async (job, change) => {
      if (change.status === "accepted") throw new Error("final commit unknown");
      return transition(job, change);
    });
    expect(await f.run(id)).toEqual({ outcome: "persistence_uncertain" });
    expect(f.stored.status).toBe("dispatching");
    await f.run(id);
    expect(f.send).toHaveBeenCalledTimes(1);
  });
  it("records a definitive rejection without labeling it delivered", async () => {
    const f = setup();
    f.send.mockResolvedValue({ status: "rejected" });
    expect(await f.run(id)).toEqual({ outcome: "rejected" });
    expect(f.stored.reason).toBe("provider_rejected");
  });
  it("fails closed on wrong queue identity and tampered claim metadata", async () => {
    const f = setup();
    f.read.mockResolvedValueOnce({ ...f.stored, id: patientId });
    expect(await f.run(id)).toEqual({ outcome: "storage_unavailable" });
    expect(f.claim).not.toHaveBeenCalled();
    const other = setup();
    other.claim.mockImplementation(async (job, attemptId) => ({
      ...job,
      patientId: clinicId,
      status: "claimed",
      attemptId,
      revision: 2,
    }));
    expect(await other.run(id)).toEqual({ outcome: "claim_uncertain" });
    expect(other.send).not.toHaveBeenCalled();
  });
  it("rejects unbounded late windows, requeued revisions and unsolicited provider URLs", async () => {
    const f = setup();
    expect(
      hydrationReminderJobSchema.safeParse({ ...f.stored, expiresAt: "2026-10-31T09:01:00Z" })
        .success,
    ).toBe(false);
    expect(hydrationReminderJobSchema.safeParse({ ...f.stored, revision: 5 }).success).toBe(false);
    f.authorize.mockResolvedValue({
      ...f.policy,
      registration: { ...f.policy.registration, url: "https://untrusted.example" },
    });
    expect(await f.run(id)).toEqual({ outcome: "cancelled" });
    expect(f.send).not.toHaveBeenCalled();
  });
});
