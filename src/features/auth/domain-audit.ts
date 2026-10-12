import { z } from "zod";
import { auditCursorSchema } from "./administrative-audit";
import { reservedDomainSchema } from "./domain-reservations";
export const domainAuditRowsSchema = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        domain_id: z.string().uuid(),
        actor_user_id: z.string().uuid(),
        action: z.literal("domain_reserved"),
        occurred_at: z.string().datetime({ offset: true }),
      })
      .strict(),
  )
  .max(101);
export const domainAuditSchema = z
  .object({
    domain: reservedDomainSchema,
    events: domainAuditRowsSchema.max(100),
    hasMore: z.boolean(),
    nextCursor: auditCursorSchema.nullable(),
  })
  .strict()
  .refine((value) => value.events.every((event) => event.domain_id === value.domain.id))
  .refine((value) =>
    value.hasMore
      ? value.events.length === 100 &&
        value.nextCursor?.beforeId === value.events.at(-1)?.id &&
        value.nextCursor?.before === value.events.at(-1)?.occurred_at
      : value.nextCursor === null,
  );
