import { z } from "zod";
import { hydrationRecordSchema, hydrationScopeSchema } from "./contracts";
const base = { recordId: z.string().uuid(), sourceRequestId: z.string().uuid() };
const document = z
  .object({
    volumeMl: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();
export const hydrationCommandSchema = z.discriminatedUnion("kind", [
  z
    .object({ ...base, kind: z.literal("create"), expectedRevision: z.literal(0), document })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("correct"),
      expectedRevision: z.number().int().min(1).max(2147483646),
      document,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("void"),
      expectedRevision: z.number().int().min(1).max(2147483646),
    })
    .strict(),
]);
export const hydrationReceiptSchema = z
  .object({
    scope: hydrationScopeSchema,
    command: hydrationCommandSchema,
    record: hydrationRecordSchema,
  })
  .strict();
export const hydrationMutationStateSchema = z
  .object({
    record: hydrationRecordSchema.nullable(),
    receipts: z.array(hydrationReceiptSchema).max(100000),
  })
  .strict();
export type HydrationCommand = z.infer<typeof hydrationCommandSchema>;
export type HydrationMutationState = z.infer<typeof hydrationMutationStateSchema>;
