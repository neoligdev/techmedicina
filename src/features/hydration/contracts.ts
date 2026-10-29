import { z } from "zod";
/** Local contract proposal. Millilitres are a storage unit, never a prescribed goal. */
export const hydrationRecordSchema = z
  .object({
    id: z.string().uuid(),
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    revision: z.number().int().positive().max(2147483647),
    status: z.enum(["active", "voided"]),
    volumeMl: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();
export const hydrationScopeSchema = z
  .object({ clinicId: z.string().uuid(), patientId: z.string().uuid() })
  .strict();
export const hydrationWindowSchema = z
  .object({
    period: z.enum(["day", "week", "month", "year"]),
    asOf: z.string().datetime({ offset: true }),
    timeZone: z
      .string()
      .min(1)
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en-CA", { timeZone: value }).format(0);
          return true;
        } catch {
          return false;
        }
      }),
  })
  .strict();
export type HydrationRecord = z.infer<typeof hydrationRecordSchema>;
export type HydrationWindow = z.infer<typeof hydrationWindowSchema>;
