import { z } from "zod";
import { hydrationScopeSchema } from "./contracts";
/** Patient-entered preferences, never a generated prescription or notification delivery. */
export const hydrationSettingsSchema = z
  .object({
    dailyGoalMl: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
    timeZone: z.enum(["America/Bahia", "America/Sao_Paulo", "UTC"]),
    remindersEnabled: z.boolean(),
    reminderTimes: z.array(z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)).max(24),
  })
  .strict()
  .refine(
    (v) => new Set(v.reminderTimes).size === v.reminderTimes.length,
    "Duplicate reminder time",
  )
  .refine(
    (v) => !v.remindersEnabled || v.reminderTimes.length > 0,
    "Choose at least one reminder time",
  );
export const hydrationSettingsCommandSchema = z
  .object({
    sourceRequestId: z.string().uuid(),
    expectedRevision: z.number().int().min(0).max(2147483646),
    settings: hydrationSettingsSchema,
  })
  .strict();
export const hydrationSettingsSnapshotSchema = hydrationScopeSchema
  .extend({ revision: z.number().int().min(1).max(2147483647), settings: hydrationSettingsSchema })
  .strict();
export const hydrationSettingsReceiptSchema = z
  .object({ command: hydrationSettingsCommandSchema, snapshot: hydrationSettingsSnapshotSchema })
  .strict();
export const hydrationSettingsResultSchema = hydrationScopeSchema
  .extend({
    preferences: hydrationSettingsSnapshotSchema.nullable(),
    receipt: hydrationSettingsReceiptSchema.nullable(),
  })
  .strict();
export type HydrationSettings = z.infer<typeof hydrationSettingsSchema>;
export function validateHydrationSettings(
  raw: unknown,
  scopeValue: unknown,
  commandValue?: unknown,
) {
  const result = hydrationSettingsResultSchema.parse(raw),
    scope = hydrationScopeSchema.parse(scopeValue);
  const sameScope = (v: { clinicId: string; patientId: string }) =>
    v.clinicId.toLowerCase() === scope.clinicId.toLowerCase() &&
    v.patientId.toLowerCase() === scope.patientId.toLowerCase();
  const fail = () => {
    throw new Error("Unexpected hydration preferences");
  };
  if (!sameScope(result) || (result.preferences && !sameScope(result.preferences))) fail();
  if (result.receipt) {
    const { command, snapshot } = result.receipt;
    if (
      !sameScope(snapshot) ||
      !result.preferences ||
      snapshot.revision !== command.expectedRevision + 1 ||
      result.preferences.revision < snapshot.revision ||
      JSON.stringify(snapshot.settings) !== JSON.stringify(command.settings)
    )
      fail();
    if (
      result.preferences!.revision === snapshot.revision &&
      JSON.stringify(result.preferences!.settings) !== JSON.stringify(snapshot.settings)
    )
      fail();
    if (
      commandValue !== undefined &&
      JSON.stringify(hydrationSettingsCommandSchema.parse(commandValue)) !== JSON.stringify(command)
    )
      fail();
  }
  return result;
}
