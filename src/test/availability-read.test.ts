import { expect, it, vi } from "vitest";
import { readOwnAvailability } from "@/lib/agenda/availability-read.server";
import type { AuthContext } from "@/lib/auth/core";
const clinicId = "11111111-1111-4111-8111-111111111111",
  doctorUserId = "22222222-2222-4222-8222-222222222222";
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
        grants: [{ resource: "agenda", action: "read" }],
      },
    ],
  },
};
const query = {
  window: { startsAt: "2026-10-15T00:00:00Z", endsAt: "2026-10-16T00:00:00Z" },
  limit: 1,
};
function row(id: string, hour = "12") {
  return {
    id,
    clinicId,
    doctorUserId,
    sourceRequestId: id,
    interval: { startsAt: `2026-10-15T${hour}:00:00Z`, endsAt: `2026-10-15T${hour}:30:00Z` },
    createdAt: "2026-10-14T00:00:00Z",
  };
}
it("derives owner and bounded keyset selection; next cursor is last returned row", async () => {
  const reader = vi.fn().mockResolvedValue([row(clinicId), row(doctorUserId)]);
  const page = await readOwnAvailability(context, query, reader);
  expect(reader).toHaveBeenCalledWith({
    clinicId,
    doctorUserId,
    startsAt: "2026-10-15T00:00:00.000Z",
    endsAt: "2026-10-16T00:00:00.000Z",
    take: 2,
    after: undefined,
  });
  expect(page.items).toHaveLength(1);
  expect(page.next).toEqual({ id: clinicId, startsAt: "2026-10-15T12:00:00.000Z" });
  expect(
    (
      await readOwnAvailability(context, { ...query, after: page.next }, async () => [
        row(doctorUserId),
      ])
    ).next,
  ).toBeNull();
});
it.each(["admin", "paciente", "super_admin", "write-only", "unverified", "inactive", "duplicate"])(
  "denies %s before reader",
  async (mode) => {
    const ctx = structuredClone(context),
      link = ctx.identity.links[0]!;
    if (["admin", "paciente", "super_admin"].includes(mode)) link.role = mode as "admin";
    if (mode === "write-only") link.grants = [{ resource: "agenda", action: "write" }];
    if (mode === "unverified") link.medicalIdentityVerified = false;
    if (mode === "inactive") link.isActive = false;
    if (mode === "duplicate") ctx.identity.links.push(structuredClone(link));
    const read = vi.fn();
    await expect(readOwnAvailability(ctx, query, read)).rejects.toMatchObject({ status: 403 });
    expect(read).not.toHaveBeenCalled();
  },
);
it("rejects injected owner, excessive limit and cursor outside window before reader", async () => {
  const read = vi.fn();
  for (const invalid of [
    { ...query, clinicId },
    { ...query, limit: 51 },
    { ...query, after: { id: clinicId, startsAt: query.window.endsAt } },
  ]) {
    await expect(readOwnAvailability(context, invalid, read)).rejects.toMatchObject({
      status: 400,
    });
  }
  expect(read).not.toHaveBeenCalled();
});
it("rejects foreign scope, excess, duplicates, wrong order and rows outside window", async () => {
  for (const rows of [
    [{ ...row(clinicId), clinicId: doctorUserId }],
    [{ ...row(clinicId), doctorUserId: clinicId }],
    [row(clinicId), row(doctorUserId), row(clinicId)],
    [row(clinicId), row(clinicId)],
    [row(doctorUserId), row(clinicId)],
    [
      {
        ...row(clinicId),
        interval: { startsAt: query.window.endsAt, endsAt: "2026-10-16T01:00:00Z" },
      },
    ],
  ])
    await expect(readOwnAvailability(context, query, async () => rows)).rejects.toThrow();
  await expect(
    readOwnAvailability(
      context,
      { ...query, after: { id: clinicId, startsAt: "2026-10-15T12:00:00Z" } },
      async () => [row(clinicId)],
    ),
  ).rejects.toThrow();
});
