import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { AvailabilityReader } from "./availability-read.server";
import { availabilityReceiptSchema } from "@/features/agenda/availability";
const row = z
  .object({
    id: z.string().uuid(),
    clinic_id: z.string().uuid(),
    doctor_user_id: z.string().uuid(),
    source_request_id: z.string().uuid(),
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
    created_at: z.string().datetime({ offset: true }),
  })
  .strict();
type Query = (sql: string, params: (string | number | null)[]) => Promise<{ rows: unknown[] }>;
/** Executor must use the same authenticated identity and RLS, never service-role. */
export function createAvailabilitySqlReader(userId: string, query: Query): AvailabilityReader {
  z.string().uuid().parse(userId);
  return async (selection) => {
    if (selection.doctorUserId !== userId) throw new Error("Unexpected availability owner");
    const result = await query(
      `
      SELECT to_jsonb(a) AS value FROM public.tm_doctor_availability a
      WHERE clinic_id=$1::uuid AND doctor_user_id=$2::uuid
        AND starts_at >= $3::timestamptz AND starts_at < $4::timestamptz
        AND ($5::timestamptz IS NULL OR (starts_at,id) > ($5::timestamptz,$6::uuid))
      ORDER BY starts_at ASC,id ASC LIMIT $7::integer`,
      [
        selection.clinicId,
        userId,
        selection.startsAt,
        selection.endsAt,
        selection.after?.startsAt ?? null,
        selection.after?.id ?? null,
        selection.take,
      ],
    );
    return result.rows.map((value) => {
      const stored = row.parse(z.object({ value: z.unknown() }).strict().parse(value).value);
      if (stored.clinic_id !== selection.clinicId || stored.doctor_user_id !== userId)
        throw new Error("Unexpected availability scope");
      return availabilityReceiptSchema.parse({
        id: stored.id,
        clinicId: stored.clinic_id,
        doctorUserId: stored.doctor_user_id,
        sourceRequestId: stored.source_request_id,
        interval: { startsAt: stored.starts_at, endsAt: stored.ends_at },
        createdAt: stored.created_at,
      });
    });
  };
}
