// @vitest-environment node
import { it, expect } from "vitest";
import {
  applyHydrationCommand,
  HydrationMutationConflict,
} from "@/lib/hydration/mutation-core.server";
import { hydrationCommandSchema } from "@/features/hydration/mutation-contract";
import { projectHydration } from "@/features/hydration/history";
const scope = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
};
const recordId = "33333333-3333-4333-8333-333333333333",
  sourceRequestId = "44444444-4444-4444-8444-444444444444",
  nextId = "55555555-5555-4555-8555-555555555555",
  voidId = "66666666-6666-4666-8666-666666666666";
const document = { volumeMl: 250, occurredAt: "2026-10-29T12:00:00Z" },
  empty = { record: null, receipts: [] };
const create = { kind: "create", recordId, sourceRequestId, expectedRevision: 0, document };
const correct = {
  kind: "correct",
  recordId,
  sourceRequestId: nextId,
  expectedRevision: 1,
  document: { ...document, volumeMl: 125 },
};
it("creates once, preserves input and returns exact receipt on retry", () => {
  const result = applyHydrationCommand(scope, empty, create);
  expect(result.state.record).toMatchObject({
    ...scope,
    id: recordId,
    revision: 1,
    status: "active",
    ...document,
  });
  expect(empty).toEqual({ record: null, receipts: [] });
  const retry = applyHydrationCommand(scope, result.state, create);
  expect(retry.replayed).toBe(true);
  expect(retry.receipt).toEqual(result.receipt);
  expect(retry.state.receipts).toHaveLength(1);
});
it("corrects optimistically without erasing original snapshot", () => {
  const first = applyHydrationCommand(scope, empty, create),
    updated = applyHydrationCommand(scope, first.state, correct);
  expect(updated.state.record).toMatchObject({ revision: 2, volumeMl: 125 });
  expect(updated.state.receipts[0]!.record.volumeMl).toBe(250);
  expect(first.state.record!.revision).toBe(1);
  expect(() =>
    applyHydrationCommand(scope, updated.state, { ...correct, sourceRequestId: voidId }),
  ).toThrow(HydrationMutationConflict);
});
it("retry of an earlier receipt never rolls current state back", () => {
  const first = applyHydrationCommand(scope, empty, create),
    updated = applyHydrationCommand(scope, first.state, correct),
    retry = applyHydrationCommand(scope, updated.state, create);
  expect(retry.receipt.record.revision).toBe(1);
  expect(retry.state.record!.revision).toBe(2);
  expect(retry.state.receipts).toHaveLength(2);
});
it("refuses request ID reuse with changed volume or timestamp", () => {
  const first = applyHydrationCommand(scope, empty, create);
  for (const changed of [
    { ...document, volumeMl: 0 },
    { ...document, occurredAt: "2026-10-29T13:00:00Z" },
  ])
    expect(() =>
      applyHydrationCommand(scope, first.state, { ...create, document: changed }),
    ).toThrow(HydrationMutationConflict);
});
it("voids without deleting history and prevents resurrection", () => {
  const first = applyHydrationCommand(scope, empty, create),
    command = { kind: "void", recordId, sourceRequestId: voidId, expectedRevision: 1 },
    cancelled = applyHydrationCommand(scope, first.state, command);
  expect(cancelled.state.record).toMatchObject({ status: "voided", revision: 2, volumeMl: 250 });
  expect(cancelled.state.receipts).toHaveLength(2);
  expect(applyHydrationCommand(scope, cancelled.state, command).replayed).toBe(true);
  expect(() =>
    applyHydrationCommand(scope, cancelled.state, { ...correct, expectedRevision: 2 }),
  ).toThrow(HydrationMutationConflict);
  expect(
    projectHydration(scope, [cancelled.state.record], {
      period: "day",
      timeZone: "America/Bahia",
      asOf: "2026-10-29T15:00:00Z",
    }).totalRecordedMl,
  ).toBeNull();
});
it("rejects cross-patient, cross-clinic and wrong-record history", () => {
  const first = applyHydrationCommand(scope, empty, create);
  for (const other of [
    { ...scope, patientId: recordId },
    { ...scope, clinicId: recordId },
  ])
    expect(() => applyHydrationCommand(other, first.state, correct)).toThrow("scope");
  expect(() => applyHydrationCommand(scope, first.state, { ...correct, recordId: nextId })).toThrow(
    "history",
  );
});
it("does not accept caller-supplied tenant, actor, target or void payload", () => {
  for (const bad of [
    { ...create, clinicId: scope.clinicId },
    { ...create, actor: "admin" },
    { ...create, document: { ...document, targetMl: 2000 } },
    { kind: "void", recordId, sourceRequestId, expectedRevision: 1, document },
  ])
    expect(() => hydrationCommandSchema.parse(bad)).toThrow();
});
it("rejects missing, stale and inconsistent histories without mutation", () => {
  expect(() => applyHydrationCommand(scope, empty, correct)).toThrow(HydrationMutationConflict);
  const first = applyHydrationCommand(scope, empty, create);
  expect(() => applyHydrationCommand(scope, { ...first.state, receipts: [] }, correct)).toThrow(
    "history",
  );
  expect(() =>
    applyHydrationCommand(
      scope,
      { ...first.state, record: { ...first.state.record, volumeMl: 1 } },
      correct,
    ),
  ).toThrow("history");
});
it("rejects receipt content inconsistent with its command", () => {
  const first = applyHydrationCommand(scope, empty, create);
  const forged = {
    ...first.state,
    receipts: [
      { ...first.receipt, command: { ...create, document: { ...document, volumeMl: 999 } } },
    ],
  };
  expect(() => applyHydrationCommand(scope, forged, correct)).toThrow("snapshot history");
});
