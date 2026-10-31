import { z } from "zod";
import { hydrationScopeSchema } from "./contracts";
const instant = z
  .string()
  .datetime({ offset: true })
  .refine((v) => (v.match(/\.(\d+)/)?.[1]?.length ?? 0) <= 3);
export const hydrationReminderJobSchema = hydrationScopeSchema
  .extend({
    id: z.string().uuid(),
    slotKey: z.string().min(1).max(220),
    preferencesRevision: z.number().int().positive().max(2147483647),
    scheduledAt: instant,
    expiresAt: instant,
    revision: z.number().int().positive().max(2147483647),
    status: z.enum([
      "queued",
      "claimed",
      "dispatching",
      "accepted",
      "rejected",
      "uncertain",
      "cancelled",
      "expired",
    ]),
    attemptId: z.string().uuid().nullable(),
    providerReceiptId: z.string().min(1).max(200).nullable(),
    reason: z
      .enum([
        "not_authorized",
        "authorization_unavailable",
        "expired",
        "provider_rejected",
        "provider_uncertain",
      ])
      .nullable(),
  })
  .strict()
  .refine(
    (v) =>
      Date.parse(v.scheduledAt) % 60000 === 0 &&
      Date.parse(v.expiresAt) - Date.parse(v.scheduledAt) === 60000,
    "One civil-minute dispatch window",
  )
  .refine((v) =>
    v.status === "queued"
      ? v.revision === 1 &&
        v.attemptId === null &&
        v.providerReceiptId === null &&
        v.reason === null
      : v.attemptId !== null,
  )
  .refine((v) =>
    v.status === "accepted"
      ? v.providerReceiptId !== null && v.reason === null
      : v.providerReceiptId === null,
  );
export type HydrationReminderJob = z.infer<typeof hydrationReminderJobSchema>;
