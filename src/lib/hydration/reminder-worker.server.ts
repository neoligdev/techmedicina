import "@tanstack/react-start/server-only";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import {
  hydrationReminderJobSchema,
  type HydrationReminderJob,
} from "@/features/hydration/reminder-job-contract";
import { hydrationSettingsSnapshotSchema } from "@/features/hydration/settings-contract";
import { hydrationReminderSlot } from "@/features/hydration/reminder-slot";
const policySchema = z
  .object({
    preferences: hydrationSettingsSnapshotSchema,
    registration: z
      .object({
        id: z.string().uuid(),
        clinicId: z.string().uuid(),
        patientId: z.string().uuid(),
        active: z.boolean(),
        consentGranted: z.boolean(),
      })
      .strict(),
  })
  .strict();
const providerResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("accepted"), receiptId: z.string().min(1).max(200) }).strict(),
  z.object({ status: z.literal("rejected") }).strict(),
]);
type Finish = "accepted" | "rejected" | "uncertain" | "cancelled" | "expired";
type Change = {
  status: "dispatching" | Finish;
  reason: HydrationReminderJob["reason"];
  providerReceiptId: string | null;
};
/** Trusted server dependencies only. No default store/provider, scheduler, endpoint or service-role client. */
export function createHydrationReminderWorker(providers: {
  read: (id: string) => Promise<unknown>;
  /** MUST atomically CAS queued -> claimed, revision+1, preserving immutable fields and the attempt. */
  claim: (job: HydrationReminderJob, attemptId: string) => Promise<unknown | null>;
  /** MUST atomically CAS revision+attempt; dispatching must never be automatically requeued. */
  transition: (job: HydrationReminderJob, change: Change) => Promise<unknown | null>;
  /** MUST reload live patient/clinic/access, enabled preferences, consent and scoped registration. */
  authorize: (job: HydrationReminderJob) => Promise<unknown | null>;
  send: (
    input: {
      destinationId: string;
      idempotencyKey: string;
      expiresAt: string;
      title: string;
      body: string;
    },
    signal: AbortSignal,
  ) => Promise<unknown>;
  now?: () => string;
  newAttemptId?: () => string;
}) {
  const now = () => {
    const value = (providers.now ?? (() => new Date().toISOString()))();
    z.string().datetime({ offset: true }).parse(value);
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) throw new Error("Invalid clock");
    return ms;
  };
  const equal = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  function sameJob(a: HydrationReminderJob, b: HydrationReminderJob) {
    return (
      equal(a.id, b.id) &&
      equal(a.clinicId, b.clinicId) &&
      equal(a.patientId, b.patientId) &&
      a.slotKey === b.slotKey &&
      a.preferencesRevision === b.preferencesRevision &&
      a.scheduledAt === b.scheduledAt &&
      a.expiresAt === b.expiresAt
    );
  }
  function checked(
    raw: unknown,
    previous: HydrationReminderJob,
    change: Change,
    attemptId = previous.attemptId,
  ) {
    const next = hydrationReminderJobSchema.parse(raw);
    if (
      !sameJob(next, previous) ||
      next.revision !== previous.revision + 1 ||
      next.status !== change.status ||
      next.attemptId !== attemptId ||
      next.reason !== change.reason ||
      next.providerReceiptId !== change.providerReceiptId
    )
      throw new Error("Invalid queue transition");
    return next;
  }
  async function finish(
    job: HydrationReminderJob,
    status: Finish,
    reason: Change["reason"],
    receiptId: string | null = null,
  ) {
    const change = { status, reason, providerReceiptId: receiptId };
    try {
      const raw = await providers.transition(structuredClone(job), structuredClone(change));
      if (!raw) return { outcome: "persistence_uncertain" as const };
      checked(raw, job, change);
      return { outcome: status };
    } catch {
      return { outcome: "persistence_uncertain" as const };
    }
  }
  return async (idValue: unknown) => {
    const id = z.string().uuid().parse(idValue);
    let queued: HydrationReminderJob;
    try {
      const raw = await providers.read(id);
      if (raw === null) return { outcome: "missing" as const };
      queued = hydrationReminderJobSchema.parse(raw);
      if (!equal(queued.id, id)) throw new Error("Wrong job");
    } catch {
      return { outcome: "storage_unavailable" as const };
    }
    if (queued.status !== "queued") return { outcome: "already_claimed_or_finished" as const };
    if (now() < Date.parse(queued.scheduledAt)) return { outcome: "not_due" as const };
    const attempt = z
      .string()
      .uuid()
      .parse((providers.newAttemptId ?? randomUUID)());
    let claimed: HydrationReminderJob;
    try {
      const raw = await providers.claim(structuredClone(queued), attempt);
      if (raw === null) return { outcome: "claim_lost" as const };
      claimed = hydrationReminderJobSchema.parse(raw);
      if (
        !sameJob(claimed, queued) ||
        claimed.revision !== queued.revision + 1 ||
        claimed.status !== "claimed" ||
        claimed.attemptId !== attempt ||
        claimed.providerReceiptId !== null ||
        claimed.reason !== null
      )
        throw new Error("Invalid claim");
    } catch {
      return { outcome: "claim_uncertain" as const };
    }
    if (now() >= Date.parse(claimed.expiresAt)) return finish(claimed, "expired", "expired");
    // Persist the fence BEFORE any provider call. A crash here is not permission to retry sending.
    let dispatching: HydrationReminderJob;
    try {
      const change: Change = { status: "dispatching", reason: null, providerReceiptId: null },
        raw = await providers.transition(structuredClone(claimed), structuredClone(change));
      if (!raw) return { outcome: "persistence_uncertain" as const };
      dispatching = checked(raw, claimed, change);
    } catch {
      return { outcome: "persistence_uncertain" as const };
    }
    let policy: z.infer<typeof policySchema>;
    try {
      const raw = await providers.authorize(structuredClone(dispatching));
      if (raw === null) return finish(dispatching, "cancelled", "not_authorized");
      policy = policySchema.parse(raw);
    } catch {
      return finish(dispatching, "cancelled", "authorization_unavailable");
    }
    const prefs = policy.preferences,
      registration = policy.registration;
    const slot = hydrationReminderSlot(prefs, dispatching.scheduledAt);
    if (
      !equal(prefs.clinicId, dispatching.clinicId) ||
      !equal(prefs.patientId, dispatching.patientId) ||
      prefs.revision !== dispatching.preferencesRevision ||
      !slot ||
      slot.key !== dispatching.slotKey ||
      !registration.active ||
      !registration.consentGranted ||
      !equal(registration.clinicId, dispatching.clinicId) ||
      !equal(registration.patientId, dispatching.patientId)
    )
      return finish(dispatching, "cancelled", "not_authorized");
    if (now() < Date.parse(dispatching.scheduledAt) || now() >= Date.parse(dispatching.expiresAt))
      return finish(dispatching, "expired", "expired");
    let result: z.infer<typeof providerResultSchema>;
    try {
      result = providerResultSchema.parse(
        await withRequestDeadline((signal) =>
          providers.send(
            {
              destinationId: registration.id,
              idempotencyKey: dispatching.id,
              expiresAt: dispatching.expiresAt,
              title: "Lembrete do aplicativo",
              body: "Abra o aplicativo para revisar seus lembretes.",
            },
            signal,
          ),
        ),
      );
    } catch {
      return finish(dispatching, "uncertain", "provider_uncertain");
    }
    return result.status === "accepted"
      ? finish(dispatching, "accepted", null, result.receiptId)
      : finish(dispatching, "rejected", "provider_rejected");
  };
}
