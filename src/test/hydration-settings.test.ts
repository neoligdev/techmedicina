import { it, expect } from "vitest";
import {
  hydrationSettingsSchema,
  validateHydrationSettings,
} from "@/features/hydration/settings-contract";
const scope = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
};
const settings = {
  dailyGoalMl: null,
  timeZone: "America/Bahia",
  remindersEnabled: false,
  reminderTimes: [],
};
it("keeps goal absent instead of inventing a recommendation, and validates reminder hours", () => {
  expect(hydrationSettingsSchema.parse(settings).dailyGoalMl).toBeNull();
  for (const patch of [
    { dailyGoalMl: 0 },
    { dailyGoalMl: 1.2 },
    { remindersEnabled: true },
    { reminderTimes: ["24:00"] },
    { reminderTimes: ["09:00", "09:00"] },
    { channel: "email" },
  ])
    expect(hydrationSettingsSchema.safeParse({ ...settings, ...patch }).success).toBe(false);
  expect(
    hydrationSettingsSchema.parse({
      ...settings,
      dailyGoalMl: 1200,
      remindersEnabled: true,
      reminderTimes: ["08:00"],
    }).dailyGoalMl,
  ).toBe(1200);
});
it("validates current settings and historical receipt against own scope and original command", () => {
  const command = {
    sourceRequestId: "33333333-3333-4333-8333-333333333333",
    expectedRevision: 0,
    settings,
  };
  const snapshot = { ...scope, revision: 1, settings };
  const raw = { ...scope, preferences: snapshot, receipt: { command, snapshot } };
  expect(validateHydrationSettings(raw, scope, command).preferences?.revision).toBe(1);
  expect(() =>
    validateHydrationSettings({ ...raw, patientId: scope.clinicId }, scope, command),
  ).toThrow();
  expect(() =>
    validateHydrationSettings(raw, scope, { ...command, expectedRevision: 1 }),
  ).toThrow();
  expect(() =>
    validateHydrationSettings(
      { ...raw, preferences: { ...snapshot, revision: 0 } },
      scope,
      command,
    ),
  ).toThrow();
  expect(
    validateHydrationSettings(
      {
        ...raw,
        preferences: { ...snapshot, revision: 2, settings: { ...settings, dailyGoalMl: 1250 } },
      },
      scope,
      command,
    ).receipt?.snapshot.revision,
  ).toBe(1);
  expect(
    validateHydrationSettings({ ...scope, preferences: null, receipt: null }, scope).preferences,
  ).toBeNull();
});
