import { expect, it, vi } from "vitest";
import { availabilityOverlaps, availabilityProposalSchema } from "@/features/agenda/availability";
import { prepareOwnAvailability } from "@/lib/agenda/availability.server";
import type { AuthContext } from "@/lib/auth/core";
const clinicId = "11111111-1111-4111-8111-111111111111",
  doctorUserId = "22222222-2222-4222-8222-222222222222";
const interval = { startsAt: "2026-10-15T09:00:00-03:00", endsAt: "2026-10-15T10:00:00-03:00" };
const proposal = { sourceRequestId: clinicId, interval };
const context: AuthContext = {
  currentClinicId: clinicId,
  identity: {
    userId: doctorUserId,
    links: [
      {
        clinicId,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: [{ resource: "agenda", action: "write" }],
      },
    ],
  },
};
it("compares instants across offsets and permits adjacent intervals", () => {
  expect(
    availabilityOverlaps(interval, {
      startsAt: "2026-10-15T12:30:00Z",
      endsAt: "2026-10-15T13:30:00Z",
    }),
  ).toBe(true);
  expect(
    availabilityOverlaps(interval, {
      startsAt: "2026-10-15T13:00:00Z",
      endsAt: "2026-10-15T14:00:00Z",
    }),
  ).toBe(false);
});
it("rejects implicit timezone, reversed/zero interval and injected ownership", () => {
  for (const value of [
    { ...proposal, clinicId },
    { ...proposal, interval: { ...interval, startsAt: "2026-10-15T09:00:00" } },
    { ...proposal, interval: { startsAt: interval.endsAt, endsAt: interval.startsAt } },
    { ...proposal, interval: { startsAt: interval.startsAt, endsAt: interval.startsAt } },
  ])
    expect(availabilityProposalSchema.safeParse(value).success).toBe(false);
});
it("derives scope from verified context and normalizes UTC without writing", async () => {
  const list = vi.fn().mockResolvedValue([]);
  expect(await prepareOwnAvailability(context, proposal, list)).toMatchObject({
    clinicId,
    doctorUserId,
    interval: { startsAt: "2026-10-15T12:00:00.000Z", endsAt: "2026-10-15T13:00:00.000Z" },
  });
  expect(list).toHaveBeenCalledWith({ clinicId, doctorUserId });
});
it("rejects foreign repository scope and overlapping occupied interval", async () => {
  await expect(
    prepareOwnAvailability(context, proposal, async () => [
      { clinicId: doctorUserId, doctorUserId, interval },
    ]),
  ).rejects.toThrow("scope");
  await expect(
    prepareOwnAvailability(context, proposal, async () => [{ clinicId, doctorUserId, interval }]),
  ).rejects.toMatchObject({ status: 409 });
});
it.each(["admin", "paciente", "super_admin"] as const)(
  "rejects %s before repository",
  async (role) => {
    const list = vi.fn();
    const link = context.identity.links[0]!;
    await expect(
      prepareOwnAvailability(
        { ...context, identity: { ...context.identity, links: [{ ...link, role }] } },
        proposal,
        list,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(list).not.toHaveBeenCalled();
  },
);
it("requires verification, grant and unique active link", async () => {
  const list = vi.fn(),
    link = context.identity.links[0]!;
  for (const links of [
    [{ ...link, medicalIdentityVerified: false }],
    [{ ...link, grants: [] }],
    [link, link],
  ])
    await expect(
      prepareOwnAvailability(
        { ...context, identity: { ...context.identity, links } },
        proposal,
        list,
      ),
    ).rejects.toMatchObject({ status: 403 });
  expect(list).not.toHaveBeenCalled();
});
