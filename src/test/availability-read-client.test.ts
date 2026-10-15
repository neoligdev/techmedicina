import { expect, it, vi } from "vitest";
import { createAvailabilityReadClient } from "@/features/agenda/availability-read-client";
const clinicId = "11111111-1111-4111-8111-111111111111",
  doctorUserId = "22222222-2222-4222-8222-222222222222";
const scope = { clinicId, doctorUserId },
  input = {
    window: { startsAt: "2026-10-15T00:00:00Z", endsAt: "2026-10-16T00:00:00Z" },
    limit: 1,
  };
const item = {
  id: clinicId,
  ...scope,
  sourceRequestId: doctorUserId,
  interval: { startsAt: "2026-10-15T12:00:00Z", endsAt: "2026-10-15T13:00:00Z" },
  createdAt: "2026-10-14T00:00:00Z",
};
const page = { ...scope, items: [item], next: null };
it("uses fresh bearer, bounded GET and sends no ownership or browser cookies", async () => {
  const token = vi.fn().mockResolvedValueOnce("one").mockResolvedValueOnce("two");
  const fetcher = vi.fn().mockImplementation(async () => Response.json({ page }));
  const read = createAvailabilityReadClient({ ...scope, getAccessToken: token }, fetcher);
  await read(input);
  await read(input);
  expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
    method: "GET",
    headers: { Authorization: "Bearer two" },
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
  });
  expect(fetcher.mock.calls[0]?.[0]).not.toContain(clinicId);
});
it("rejects foreign, unordered, oversized and inconsistent next pages", async () => {
  for (const invalid of [
    { ...page, clinicId: doctorUserId },
    { ...page, items: [{ ...item, doctorUserId: clinicId }] },
    { ...page, items: [item, item] },
    { ...page, next: { id: doctorUserId, startsAt: item.interval.startsAt } },
  ]) {
    const read = createAvailabilityReadClient(
      { ...scope, getAccessToken: async () => "qa" },
      async () => Response.json({ page: invalid }),
    );
    await expect(read(input)).rejects.toThrow();
  }
});
it("missing token does not call network", async () => {
  const fetcher = vi.fn();
  await expect(
    createAvailabilityReadClient({ ...scope, getAccessToken: async () => null }, fetcher)(input),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
