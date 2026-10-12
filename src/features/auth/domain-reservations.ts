import { z } from "zod";
import { normalizeHost, RESERVED_HOST_NAMES } from "@/lib/white-label/host-resolver";
export const domainReservationInputSchema = z
  .object({
    clinicId: z.string().uuid(),
    hostname: z
      .string()
      .max(253)
      .refine((value) => {
        const result = normalizeHost(value);
        return (
          result.host === value &&
          value.includes(".") &&
          !value.includes(":") &&
          !RESERVED_HOST_NAMES.has(value.split(".")[0] ?? "")
        );
      }),
    environment: z.enum(["clinic_portal", "patient_pwa"]),
  })
  .strict();
export type DomainReservationInput = z.infer<typeof domainReservationInputSchema>;
export const reservedDomainSchema = z
  .object({
    id: z.string().uuid(),
    clinic_id: z.string().uuid(),
    hostname: domainReservationInputSchema.shape.hostname,
    environment: domainReservationInputSchema.shape.environment,
    status: z.literal("pending_verification"),
    revision: z.number().int().positive(),
    created_at: z.string().datetime({ offset: true }),
  })
  .strict();
