import { z } from "zod";
import { availabilityIntervalSchema, availabilityReceiptSchema } from "./availability";
export const availabilityCursorSchema = z
  .object({ startsAt: z.string().datetime({ offset: true }), id: z.string().uuid() })
  .strict();
/** Window selects intervals whose start is in [startsAt, endsAt). */
export const availabilityPageQuerySchema = z
  .object({
    window: availabilityIntervalSchema,
    limit: z.number().int().min(1).max(50).default(20),
    after: availabilityCursorSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.after ||
      (Date.parse(value.after.startsAt) >= Date.parse(value.window.startsAt) &&
        Date.parse(value.after.startsAt) < Date.parse(value.window.endsAt)),
    { message: "Cursor outside window" },
  );
export const availabilityPageSchema = z
  .object({
    clinicId: z.string().uuid(),
    doctorUserId: z.string().uuid(),
    items: z.array(availabilityReceiptSchema).max(50),
    next: availabilityCursorSchema.nullable(),
  })
  .strict();
