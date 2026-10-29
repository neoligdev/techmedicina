import { z } from "zod";
import { deviceRegistrationDocumentSchema } from "./registration-contract";
export const deviceRegistrationVersionQuerySchema = z
  .object({ id: z.string().uuid(), revision: z.number().int().positive().max(2147483647) })
  .strict();
export const deviceRegistrationVersionSchema = z
  .object({
    integrationAuthorized: z.literal(false),
    draftId: z.string().uuid(),
    revision: z.number().int().positive().max(2147483647),
    document: deviceRegistrationDocumentSchema,
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();
