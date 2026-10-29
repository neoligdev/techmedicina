import "@tanstack/react-start/server-only";
import { hydrationRecordSchema, hydrationScopeSchema } from "@/features/hydration/contracts";
import {
  hydrationCommandSchema,
  hydrationMutationStateSchema,
  hydrationReceiptSchema,
} from "@/features/hydration/mutation-contract";
export class HydrationMutationConflict extends Error {}
/** Pure server reference transition. Caller must resolve authorization, lock and persist atomically. */
export function applyHydrationCommand(
  scopeValue: unknown,
  stateValue: unknown,
  commandValue: unknown,
) {
  const scope = hydrationScopeSchema.parse(scopeValue),
    state = hydrationMutationStateSchema.parse(stateValue),
    command = hydrationCommandSchema.parse(commandValue);
  const sameScope = (value: { clinicId: string; patientId: string }) =>
    value.clinicId === scope.clinicId && value.patientId === scope.patientId;
  if (
    (state.record && !sameScope(state.record)) ||
    state.receipts.some((r) => !sameScope(r.scope) || !sameScope(r.record))
  )
    throw new Error("Unexpected hydration scope");
  if (new Set(state.receipts.map((r) => r.command.sourceRequestId)).size !== state.receipts.length)
    throw new Error("Duplicate receipt");
  if (state.record) {
    if (
      state.record.id !== command.recordId ||
      state.receipts.length !== state.record.revision ||
      state.receipts.some(
        (r, i) =>
          r.record.id !== state.record!.id ||
          r.command.recordId !== r.record.id ||
          r.record.revision !== i + 1,
      ) ||
      JSON.stringify(state.receipts.at(-1)?.record) !== JSON.stringify(state.record)
    )
      throw new Error("Invalid hydration history");
  } else if (state.receipts.length) throw new Error("Orphan hydration receipts");
  for (let i = 0; i < state.receipts.length; i++) {
    const item = state.receipts[i]!,
      prior = state.receipts[i - 1]?.record,
      action = item.command;
    if (
      action.expectedRevision !== i ||
      (i === 0 ? action.kind !== "create" : action.kind === "create" || prior?.status !== "active")
    )
      throw new Error("Invalid hydration transition history");
    const expected = hydrationRecordSchema.parse(
      action.kind === "void"
        ? { ...prior!, status: "voided", revision: i + 1 }
        : { ...scope, id: action.recordId, revision: i + 1, status: "active", ...action.document },
    );
    if (JSON.stringify(expected) !== JSON.stringify(item.record))
      throw new Error("Invalid hydration snapshot history");
  }
  const previous = state.receipts.find(
    (r) => r.command.sourceRequestId === command.sourceRequestId,
  );
  if (previous) {
    if (JSON.stringify(previous.command) !== JSON.stringify(command))
      throw new HydrationMutationConflict("Request identifier reused with different content");
    return { state, receipt: previous, replayed: true };
  }
  if (state.receipts.length >= 100000)
    throw new HydrationMutationConflict("History capacity reached");
  const current = state.record;
  if (command.kind === "create") {
    if (current) throw new HydrationMutationConflict("Record already exists");
  } else {
    if (!current || command.expectedRevision !== current.revision)
      throw new HydrationMutationConflict("Revision conflict");
    if (current.status === "voided") throw new HydrationMutationConflict("Record already voided");
  }
  const record =
    command.kind === "void"
      ? { ...current!, status: "voided" as const, revision: current!.revision + 1 }
      : {
          ...scope,
          id: command.recordId,
          revision: current ? current.revision + 1 : 1,
          status: "active" as const,
          ...command.document,
        };
  const receipt = hydrationReceiptSchema.parse({ scope, command, record });
  return {
    state: { record: receipt.record, receipts: [...state.receipts, receipt] },
    receipt,
    replayed: false,
  };
}
