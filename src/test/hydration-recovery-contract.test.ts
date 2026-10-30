import { describe, expect, it } from "vitest";
import { validateHydrationRecovery } from "@/features/hydration/recovery-contract";
const scope = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
};
const command = {
  kind: "create",
  recordId: "33333333-3333-4333-8333-333333333333",
  sourceRequestId: "44444444-4444-4444-8444-444444444444",
  expectedRevision: 0,
  document: { volumeMl: 250, occurredAt: "2026-10-30T12:00:00.123456Z" },
};
const snapshot = {
  ...scope,
  id: command.recordId,
  revision: 1,
  status: "active",
  ...command.document,
};
const response = () => ({
  ...scope,
  receipt: { scope: { ...scope }, command: structuredClone(command), record: { ...snapshot } },
  record: { ...snapshot },
});
const check = (v: unknown, c: unknown = command) => validateHydrationRecovery(v, scope, c);
describe("Hydration receipt confirmation contract", () => {
  it("confirms the original command without mutating inputs", () => {
    const raw = response(),
      before = structuredClone(raw);
    expect(check(raw).confirmation).toBe("confirmed");
    expect(raw).toEqual(before);
  });
  it("preserves a newer current revision instead of rolling back to the receipt", () => {
    const raw = response();
    raw.record.revision = 3;
    raw.record.volumeMl = 100;
    expect(check(raw)).toMatchObject({
      confirmation: "confirmed",
      record: { revision: 3, volumeMl: 100 },
      receipt: { record: { revision: 1 } },
    });
  });
  it("treats missing receipt as uncertain, with or without an existing record", () => {
    expect(check({ ...scope, receipt: null, record: null }).confirmation).toBe("unconfirmed");
    expect(check({ ...scope, receipt: null, record: snapshot }).confirmation).toBe("unconfirmed");
  });
  it("accepts equivalent timezone and fraction representations", () => {
    const raw = response();
    raw.receipt.record.occurredAt = "2026-10-30T09:00:00.1234560-03:00";
    expect(check(raw).confirmation).toBe("confirmed");
  });
  it("rejects a one-microsecond discrepancy even in the same millisecond", () => {
    const raw = response();
    raw.receipt.record.occurredAt = "2026-10-30T12:00:00.123457Z";
    expect(() => check(raw)).toThrow();
  });
  it("rejects foreign scope at every nested level", () => {
    for (const path of ["root", "scope", "snapshot", "current"]) {
      const raw = response();
      if (path === "root") raw.patientId = scope.clinicId;
      if (path === "scope") raw.receipt.scope.clinicId = scope.patientId;
      if (path === "snapshot") raw.receipt.record.patientId = scope.clinicId;
      if (path === "current") raw.record.clinicId = scope.patientId;
      expect(() => check(raw)).toThrow();
    }
  });
  it("rejects substituted request, record, payload or revision", () => {
    for (const mutate of [
      (v: ReturnType<typeof response>) => {
        v.receipt.command.sourceRequestId = scope.clinicId;
      },
      (v: ReturnType<typeof response>) => {
        v.receipt.record.id = scope.clinicId;
      },
      (v: ReturnType<typeof response>) => {
        v.receipt.command.document.volumeMl = 999;
      },
      (v: ReturnType<typeof response>) => {
        v.receipt.record.revision = 2;
      },
      (v: ReturnType<typeof response>) => {
        v.record.volumeMl = 999;
      },
    ]) {
      const raw = response();
      mutate(raw);
      expect(() => check(raw)).toThrow();
    }
  });
  it("requires a current record for a confirmed receipt and rejects extra fields", () => {
    expect(() => check({ ...response(), record: null })).toThrow();
    expect(() => check({ ...response(), actor: "private" })).toThrow();
  });
  it("validates correction receipt and terminal void without resurrection", () => {
    const correction = { ...command, kind: "correct", expectedRevision: 1 };
    const corrected = { ...snapshot, revision: 2 };
    expect(
      check(
        { ...scope, receipt: { scope, command: correction, record: corrected }, record: corrected },
        correction,
      ).confirmation,
    ).toBe("confirmed");
    const voidCommand = {
      kind: "void",
      recordId: command.recordId,
      sourceRequestId: command.sourceRequestId,
      expectedRevision: 2,
    };
    const voided = { ...snapshot, revision: 3, status: "voided" };
    const raw = {
      ...scope,
      receipt: { scope, command: voidCommand, record: voided },
      record: voided,
    };
    expect(check(raw, voidCommand).confirmation).toBe("confirmed");
    expect(() => check({ ...raw, record: { ...voided, revision: 4 } }, voidCommand)).toThrow();
  });
});
