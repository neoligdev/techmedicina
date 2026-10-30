import { describe, it, expect } from "vitest";
import { projectHydration } from "@/features/hydration/history";
import { hydrationRecordSchema } from "@/features/hydration/contracts";
const clinicId = "11111111-1111-4111-8111-111111111111",
  patientId = "22222222-2222-4222-8222-222222222222";
const scope = { clinicId, patientId },
  window = { period: "day", timeZone: "America/Bahia", asOf: "2026-10-29T15:00:00Z" };
const record = (
  id = "33333333-3333-4333-8333-333333333333",
  volumeMl = 250,
  occurredAt = "2026-10-29T12:00:00Z",
) => ({ id, ...scope, revision: 1, status: "active", volumeMl, occurredAt });
describe("Hydration current-snapshot projection", () => {
  it("keeps absence unknown and explicit zero as recorded without inferring actual consumption", () => {
    expect(projectHydration(scope, [], window)).toMatchObject({
      totalRecordedMl: null,
      recordCount: 0,
      buckets: [{ recordedMl: null, evidence: "missing" }],
    });
    expect(projectHydration(scope, [record(undefined, 0)], window)).toMatchObject({
      totalRecordedMl: 0,
      recordCount: 1,
      buckets: [{ recordedMl: 0, evidence: "recorded" }],
    });
  });
  it("uses tenant and patient scope and refuses duplicate snapshots instead of double counting", () => {
    expect(() => projectHydration(scope, [record(), record()], window)).toThrow("Duplicate");
    for (const other of [
      { ...record(), clinicId: patientId },
      { ...record(), patientId: clinicId },
    ])
      expect(() => projectHydration(scope, [other], window)).toThrow("scope");
  });
  it("uses local calendar boundaries and excludes future occurrences", () => {
    const records = [
      record(undefined, 100, "2026-10-29T02:59:59Z"),
      record("44444444-4444-4444-8444-444444444444", 200, "2026-10-29T03:00:00Z"),
      record("55555555-5555-4555-8555-555555555555", 900, "2026-10-29T15:00:01Z"),
    ];
    expect(projectHydration(scope, records, window).totalRecordedMl).toBe(200);
  });
  it("counts a corrected current snapshot once and excludes a voided record", () => {
    expect(
      projectHydration(scope, [{ ...record(), revision: 2, volumeMl: 125 }], window)
        .totalRecordedMl,
    ).toBe(125);
    expect(
      projectHydration(scope, [{ ...record(), status: "voided" }], window).totalRecordedMl,
    ).toBeNull();
  });
  it("provides seven local dates across year boundaries", () => {
    const p = projectHydration(scope, [], {
      ...window,
      period: "week",
      asOf: "2027-01-02T12:00:00Z",
    });
    expect(p.buckets.map((b) => b.key)).toEqual([
      "2026-12-27",
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });
  it("handles leap-year month and excludes unelapsed dates", () => {
    expect(
      projectHydration(scope, [], { ...window, period: "month", asOf: "2028-02-29T12:00:00Z" })
        .buckets,
    ).toHaveLength(29);
    expect(
      projectHydration(scope, [], { ...window, period: "month", asOf: "2026-02-28T12:00:00Z" })
        .buckets,
    ).toHaveLength(28);
  });
  it("aggregates annual history by elapsed calendar months without manufacturing missing records", () => {
    const p = projectHydration(scope, [record()], { ...window, period: "year" });
    expect(p.buckets).toHaveLength(10);
    expect(p.buckets[0]).toMatchObject({ key: "2026-01", recordedMl: null });
    expect(p.buckets[9]).toMatchObject({ key: "2026-10", recordedMl: 250 });
  });
  it("counts both repeated DST-hour entries without losing or duplicating volume", () => {
    const records = [
      record(undefined, 100, "2026-11-01T05:30:00Z"),
      record("44444444-4444-4444-8444-444444444444", 200, "2026-11-01T06:30:00Z"),
    ];
    expect(
      projectHydration(scope, records, {
        ...window,
        timeZone: "America/New_York",
        asOf: "2026-11-01T23:00:00Z",
      }).totalRecordedMl,
    ).toBe(300);
  });
  it("rejects absent/invalid zone, ambiguous timestamps, negative/fractional volume and extra clinical targets", () => {
    for (const bad of [
      { ...window, timeZone: "invalid" },
      { period: "day", asOf: window.asOf },
      { ...window, asOf: "2026-10-29T12:00:00" },
      { ...window, targetMl: 2000 },
    ])
      expect(() => projectHydration(scope, [], bad)).toThrow();
    for (const volumeMl of [-1, 0.1, Infinity, Number.MAX_SAFE_INTEGER + 1])
      expect(() => hydrationRecordSchema.parse({ ...record(), volumeMl })).toThrow();
  });
  it("fails safely on totals outside exact integer range", () => {
    expect(() =>
      projectHydration(
        scope,
        [
          record(undefined, Number.MAX_SAFE_INTEGER),
          record("44444444-4444-4444-8444-444444444444", 1),
        ],
        window,
      ),
    ).toThrow("exact integer");
  });
});
it("does not count a future occurrence within the same millisecond", () => {
  const projection = projectHydration(
    scope,
    [record(undefined, 250, "2026-10-29T15:00:00.000001Z")],
    { ...window, asOf: "2026-10-29T15:00:00.000Z" },
  );
  expect(projection.totalRecordedMl).toBeNull();
});
