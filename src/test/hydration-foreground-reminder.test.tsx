import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { hydrationReminderSlot } from "@/features/hydration/reminder-slot";
import { HydrationForegroundReminder } from "@/features/hydration/foreground-reminder";
const preferences = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
  revision: 1,
  settings: {
    dailyGoalMl: null,
    timeZone: "America/Bahia" as const,
    remindersEnabled: true,
    reminderTimes: ["09:00"],
  },
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("uses explicit clinic timezone and no backlog outside the chosen minute", () => {
  expect(hydrationReminderSlot(preferences, "2026-10-31T12:00:59Z")).toMatchObject({
    localDate: "2026-10-31",
    localTime: "09:00",
    timeZone: "America/Bahia",
  });
  expect(hydrationReminderSlot(preferences, "2026-10-31T12:01:00Z")).toBeNull();
  expect(
    hydrationReminderSlot(
      { ...preferences, settings: { ...preferences.settings, remindersEnabled: false } },
      "2026-10-31T12:00:00Z",
    ),
  ).toBeNull();
  expect(
    hydrationReminderSlot(
      { ...preferences, settings: { ...preferences.settings, timeZone: "UTC" } },
      "2026-10-31T12:00:00Z",
    ),
  ).toBeNull();
});
it("uses one civil slot through DST repetition and preference revisions", () => {
  const p = {
    ...preferences,
    settings: { ...preferences.settings, timeZone: "America/Sao_Paulo", reminderTimes: ["23:30"] },
  };
  const a = hydrationReminderSlot(p, "2019-02-17T01:30:00Z"),
    b = hydrationReminderSlot({ ...p, revision: 2 }, "2019-02-17T02:30:00Z");
  expect(a?.key).toBe(b?.key);
  expect(a?.localDate).toBe("2019-02-16");
  expect(
    hydrationReminderSlot({ ...p, patientId: preferences.clinicId }, "2019-02-17T01:30:00Z")?.key,
  ).not.toBe(a?.key);
});
it("shows one generic notice per mounted slot and does not equate dismissal to intake", () => {
  const { rerender } = render(<HydrationForegroundReminder preferences={preferences} />);
  expect(
    screen.getByRole("status", { name: "Lembrete de hidratação no aplicativo" }),
  ).toHaveTextContent("não registra consumo nem recomenda um volume");
  fireEvent.click(screen.getByRole("button", { name: "Fechar aviso de hidratação" }));
  act(() => vi.advanceTimersByTime(15000));
  expect(screen.queryByRole("status")).toBeNull();
  rerender(<HydrationForegroundReminder preferences={{ ...preferences, revision: 2 }} />);
  expect(screen.queryByRole("status")).toBeNull();
  act(() => {
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    vi.advanceTimersByTime(15000);
  });
  expect(screen.getByRole("status")).toBeInTheDocument();
});
it("does not replay missed minutes after hidden tab resumes", () => {
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  render(<HydrationForegroundReminder preferences={preferences} />);
  expect(screen.queryByRole("status")).toBeNull();
  act(() => vi.advanceTimersByTime(60000));
  visibility.mockReturnValue("visible");
  fireEvent(document, new Event("visibilitychange"));
  expect(screen.queryByRole("status")).toBeNull();
});
it("pauses for pending edits and removes timer on unmount", () => {
  const { rerender, unmount } = render(
    <HydrationForegroundReminder preferences={preferences} paused />,
  );
  expect(screen.queryByRole("status")).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
  rerender(<HydrationForegroundReminder preferences={preferences} />);
  expect(screen.getByRole("status")).toBeInTheDocument();
  rerender(<HydrationForegroundReminder preferences={preferences} paused />);
  expect(screen.queryByRole("status")).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it("suppresses reminders after clock moves backward and validates input", () => {
  const { rerender } = render(<HydrationForegroundReminder preferences={preferences} />);
  fireEvent.click(screen.getByRole("button", { name: "Fechar aviso de hidratação" }));
  act(() => vi.setSystemTime(new Date("2026-10-30T12:00:00Z")));
  rerender(<HydrationForegroundReminder preferences={{ ...preferences, revision: 2 }} />);
  expect(screen.queryByRole("status")).toBeNull();
  expect(() =>
    hydrationReminderSlot(
      { ...preferences, settings: { ...preferences.settings, reminderTimes: ["25:00"] } },
      "2026-10-31T12:00:00Z",
    ),
  ).toThrow();
});
