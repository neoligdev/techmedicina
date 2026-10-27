// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createSelfReportRecoveryClient } from "@/features/journey/self-report-recovery-client";
import { JourneySelfReportConflict } from "@/features/journey/self-report-client";
const scope = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
  getAccessToken: async () => "qa",
};
const input = {
  goalId: "33333333-3333-4333-8333-333333333333",
  sourceEventId: "44444444-4444-4444-8444-444444444444",
  occurredAt: "2026-10-01T10:00:00.123Z",
};
const event = {
  id: "55555555-5555-4555-8555-555555555555",
  ...input,
  receivedAt: "2026-10-01T10:00:01Z",
};
const page = {
  clinicId: scope.clinicId,
  patientId: scope.patientId,
  events: [event],
  nextCursor: null,
};
it("confirms only matching persisted source/goal/time with a bounded authorized GET", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ page }));
  expect(await createSelfReportRecoveryClient(scope, fetcher)(input)).toMatchObject({
    ...input,
    id: event.id,
    clinicId: scope.clinicId,
    patientId: scope.patientId,
  });
  expect(fetcher).toHaveBeenCalledWith(
    "/api/journey/self-reports?limit=100",
    expect.objectContaining({ method: "GET", credentials: "omit", cache: "no-store" }),
  );
});
it("absence remains unknown, foreign scope is rejected, and conflicting goal or microsecond raises conflict", async () => {
  expect(
    await createSelfReportRecoveryClient(scope, async () =>
      Response.json({ page: { ...page, events: [] } }),
    )(input),
  ).toBeNull();
  await expect(
    createSelfReportRecoveryClient(scope, async () =>
      Response.json({ page: { ...page, patientId: input.goalId } }),
    )(input),
  ).rejects.toThrow();
  for (const altered of [
    { ...event, goalId: scope.clinicId },
    { ...event, occurredAt: "2026-10-01T10:00:00.123001Z" },
  ]) {
    await expect(
      createSelfReportRecoveryClient(scope, async () =>
        Response.json({ page: { ...page, events: [altered] } }),
      )(input),
    ).rejects.toBeInstanceOf(JourneySelfReportConflict);
  }
});
it("normalizes offsets and trailing zeroes without truncating conflict precision", async () => {
  const altered = { ...event, occurredAt: "2026-10-01T07:00:00.123000-03:00" };
  expect(
    await createSelfReportRecoveryClient(scope, async () =>
      Response.json({ page: { ...page, events: [altered] } }),
    )(input),
  ).toMatchObject({ id: event.id });
});
