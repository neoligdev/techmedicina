import { z } from "zod";
import { hydrationRecordSchema, hydrationScopeSchema } from "./contracts";
const bound = z
  .string()
  .datetime({ offset: true })
  .refine(
    (v) => (v.match(/\.(\d+)/)?.[1]?.length ?? 0) <= 3,
    "Bounds require millisecond precision or less",
  );
export const hydrationListQuerySchema = z
  .object({
    from: bound,
    until: bound,
    after: z
      .string()
      .uuid()
      .transform((v) => v.toLowerCase())
      .optional(),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict()
  .refine((q) => Date.parse(q.from) < Date.parse(q.until));
export const hydrationListPageSchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    from: bound,
    until: bound,
    records: z.array(hydrationRecordSchema).max(100),
    nextCursor: z.string().uuid().nullable(),
  })
  .strict();
export function validateHydrationPage(raw: unknown, scopeValue: unknown, queryValue: unknown) {
  const p = hydrationListPageSchema.parse(raw),
    scope = hydrationScopeSchema.parse(scopeValue),
    q = hydrationListQuerySchema.parse(queryValue);
  if (
    p.clinicId !== scope.clinicId ||
    p.patientId !== scope.patientId ||
    Date.parse(p.from) !== Date.parse(q.from) ||
    Date.parse(p.until) !== Date.parse(q.until) ||
    p.records.length > q.limit ||
    (p.nextCursor !== null &&
      (p.records.length !== q.limit || p.nextCursor !== p.records.at(-1)?.id)) ||
    new Set(p.records.map((r) => r.id.toLowerCase())).size !== p.records.length ||
    p.records.some(
      (r, i) =>
        r.clinicId !== scope.clinicId ||
        r.patientId !== scope.patientId ||
        Date.parse(r.occurredAt) < Date.parse(q.from) ||
        Date.parse(r.occurredAt) >= Date.parse(q.until) ||
        (i > 0 && p.records[i - 1]!.id.toLowerCase() >= r.id.toLowerCase()) ||
        (q.after !== undefined && r.id.toLowerCase() <= q.after),
    )
  )
    throw new Error("Unexpected hydration page");
  return p;
}
