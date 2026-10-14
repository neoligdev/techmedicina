import { describe, it, expect, vi } from "vitest";
import {
  createJourneyGoalDraftClient,
  JourneyGoalDraftConflict,
} from "@/features/journey/goal-draft-client";
const clinicId = "11111111-1111-4111-8111-111111111111";
const patientId = "22222222-2222-4222-8222-222222222222";
const input = {
  patientId,
  sourceRequestId: "33333333-3333-4333-8333-333333333333",
  kind: "sleep",
  cadence: "daily",
};
const draft = {
  ...input,
  clinicId,
  id: "44444444-4444-4444-8444-444444444444",
  state: "draft",
  createdAt: "2026-10-14T12:00:00.000Z",
};
describe("medical draft transport", () => {
  it("uses fresh bearer and preserves the request on retry after lost response", async () => {
    const getAccessToken = vi.fn().mockResolvedValueOnce("one").mockResolvedValueOnce("two");
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("lost"))
      .mockResolvedValueOnce(Response.json({ draft }));
    const client = createJourneyGoalDraftClient({ clinicId, patientId, getAccessToken }, fetcher);
    await expect(client(input)).rejects.toThrow("lost");
    await expect(client(input)).resolves.toEqual(draft);
    expect(getAccessToken).toHaveBeenCalledTimes(2);
    const first = fetcher.mock.calls[0];
    const second = fetcher.mock.calls[1];
    if (!first || !second) throw new Error("Missing transport calls");
    expect(first[0]).toBe("/api/journey/goal-drafts");
    expect(first[1].body).toBe(second[1].body);
    expect(second[1]).toMatchObject({
      method: "POST",
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      headers: { Authorization: "Bearer two" },
    });
  });
  it.each([
    { clinicId: patientId },
    { patientId: clinicId },
    { sourceRequestId: clinicId },
    { kind: "hydration" },
    { cadence: "weekly" },
    { state: "active" },
    { extra: true },
  ])("rejects mismatched or unexpected receipt %j", async (change) => {
    const client = createJourneyGoalDraftClient(
      { clinicId, patientId, getAccessToken: async () => "token" },
      vi.fn().mockResolvedValue(Response.json({ draft: { ...draft, ...change } })),
    );
    await expect(client(input)).rejects.toThrow();
  });
  it("rejects wrong patient or injected tenant before sending", async () => {
    const fetcher = vi.fn();
    const client = createJourneyGoalDraftClient(
      { clinicId, patientId, getAccessToken: async () => "token" },
      fetcher,
    );
    await expect(client({ ...input, patientId: clinicId })).rejects.toThrow();
    await expect(client({ ...input, clinicId })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires session and distinguishes conflict", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 409 }));
    await expect(
      createJourneyGoalDraftClient(
        { clinicId, patientId, getAccessToken: async () => null },
        fetcher,
      )(input),
    ).rejects.toThrow("Session required");
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      createJourneyGoalDraftClient(
        { clinicId, patientId, getAccessToken: async () => "token" },
        fetcher,
      )(input),
    ).rejects.toBeInstanceOf(JourneyGoalDraftConflict);
  });
});
