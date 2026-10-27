import { z } from "zod";
import { selfReportHistoryPageSchema } from "./self-report-history";
export const selfReportStatusQuerySchema = z.object({ sourceEventId: z.string().uuid() }).strict();
export const selfReportStatusSchema = z
  .object({
    clinicId: z.string().uuid(),
    patientId: z.string().uuid(),
    event: selfReportHistoryPageSchema.innerType().shape.events.element.nullable(),
  })
  .strict();
