import { z } from "zod";
import { hydrationRecordSchema, hydrationScopeSchema } from "./contracts";
import { hydrationCommandSchema, hydrationReceiptSchema } from "./mutation-contract";

export const hydrationRecoverySchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    receipt: hydrationReceiptSchema.nullable(),
    record: hydrationRecordSchema.nullable(),
  })
  .strict();

/** Compare full fractional seconds; Date alone discards PostgreSQL microseconds. */
function sameInstant(a: string, b: string) {
  const fraction = (v: string) => (v.match(/\.(\d+)/)?.[1] ?? "").replace(/0+$/, "");
  return (
    Math.floor(Date.parse(a) / 1000) === Math.floor(Date.parse(b) / 1000) &&
    fraction(a) === fraction(b)
  );
}
const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Read confirmation only. A missing receipt does not prove that an in-flight write failed. */
export function validateHydrationRecovery(
  raw: unknown,
  scopeValue: unknown,
  commandValue: unknown,
) {
  const result = hydrationRecoverySchema.parse(raw);
  const scope = hydrationScopeSchema.parse(scopeValue);
  const command = hydrationCommandSchema.parse(commandValue);
  const matchesScope = (v: { clinicId: string; patientId: string }) =>
    sameId(v.clinicId, scope.clinicId) && sameId(v.patientId, scope.patientId);
  const fail = () => {
    throw new Error("Unexpected hydration confirmation");
  };
  if (!matchesScope(result)) fail();
  const current = result.record;
  if (current && (!matchesScope(current) || !sameId(current.id, command.recordId))) fail();
  const receipt = result.receipt;
  if (!receipt) return { ...result, confirmation: "unconfirmed" as const };
  const accepted = receipt.command,
    snapshot = receipt.record;
  if (
    !current ||
    !matchesScope(receipt.scope) ||
    !matchesScope(snapshot) ||
    !sameId(snapshot.id, command.recordId) ||
    !sameId(accepted.recordId, command.recordId) ||
    !sameId(accepted.sourceRequestId, command.sourceRequestId) ||
    accepted.kind !== command.kind ||
    accepted.expectedRevision !== command.expectedRevision ||
    snapshot.revision !== command.expectedRevision + 1 ||
    current.revision < snapshot.revision ||
    snapshot.status !== (command.kind === "void" ? "voided" : "active")
  )
    fail();
  if (command.kind !== "void") {
    if (
      accepted.kind === "void" ||
      accepted.document.volumeMl !== command.document.volumeMl ||
      !sameInstant(accepted.document.occurredAt, command.document.occurredAt) ||
      snapshot.volumeMl !== command.document.volumeMl ||
      !sameInstant(snapshot.occurredAt, command.document.occurredAt)
    )
      fail();
  }
  if (
    current!.revision === snapshot.revision &&
    (current!.status !== snapshot.status ||
      current!.volumeMl !== snapshot.volumeMl ||
      !sameInstant(current!.occurredAt, snapshot.occurredAt))
  )
    fail();
  // An accepted void is terminal: a later revision would imply resurrection.
  if (snapshot.status === "voided" && current!.revision !== snapshot.revision) fail();
  return { ...result, confirmation: "confirmed" as const };
}
