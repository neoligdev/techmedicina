import { z } from "zod";
export const administrativeAuditRowsSchema = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        actor_user_id: z.string().uuid(),
        clinic_id: z.string().uuid(),
        action: z.enum(["clinic_created", "clinic_updated"]),
        changed_fields: z.array(z.enum(["name", "is_active"])).max(2),
        occurred_at: z.string().datetime({ offset: true }),
      })
      .strict(),
  )
  .max(101);
export const administrativeAuditSchema = z
  .object({
    events: administrativeAuditRowsSchema.max(100),
    hasMore: z.boolean(),
  })
  .strict();
