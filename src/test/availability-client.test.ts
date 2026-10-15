import { expect, it, vi } from "vitest";
import {
  createAvailabilityClient,
  AvailabilityConflict,
} from "@/features/agenda/availability-client";
const clinicId = "11111111-1111-4111-8111-111111111111",
  doctorUserId = "22222222-2222-4222-8222-222222222222",
  id = "33333333-3333-4333-8333-333333333333";
const input = {
  sourceRequestId: id,
  interval: { startsAt: "2026-10-15T12:00:00Z", endsAt: "2026-10-15T13:00:00Z" },
};
const receipt = { id, clinicId, doctorUserId, ...input, createdAt: "2026-10-14T12:00:00Z" };
it("requires session and rejects injected owner before sending", async () => {
  const fetcher = vi.fn();
  const client = createAvailabilityClient(
    { clinicId, doctorUserId, getAccessToken: async () => null },
    fetcher,
  );
  await expect(client(input)).rejects.toThrow("Session required");
  await expect(client({ ...input, doctorUserId })).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([
  { clinicId: doctorUserId },
  { doctorUserId: clinicId },
  { sourceRequestId: clinicId },
  { interval: { ...input.interval, endsAt: "2026-10-15T14:00:00Z" } },
])("rejects divergent receipt %j", async (change) => {
  const client = createAvailabilityClient(
    { clinicId, doctorUserId, getAccessToken: async () => "qa" },
    vi.fn(async () => Response.json({ receipt: { ...receipt, ...change } })),
  );
  await expect(client(input)).rejects.toThrow("Unexpected availability receipt");
});
it("fresh bearer, no cache/cookies, explicit conflict", async () => {
  const getAccessToken = vi.fn().mockResolvedValueOnce("one").mockResolvedValueOnce("two");
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ receipt }))
    .mockResolvedValueOnce(new Response(null, { status: 409 }));
  const client = createAvailabilityClient({ clinicId, doctorUserId, getAccessToken }, fetcher);
  await expect(client(input)).resolves.toEqual(receipt);
  await expect(client(input)).rejects.toBeInstanceOf(AvailabilityConflict);
  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/agenda/availability",
    expect.objectContaining({
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      headers: { Authorization: "Bearer two", "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
});
