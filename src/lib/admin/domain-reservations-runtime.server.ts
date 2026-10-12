import "@tanstack/react-start/server-only";
import {
  resolveBrandingContext as resolveRequestContext,
  query as requestDatabaseQuery,
} from "./clinic-branding-runtime.server";
import { createDomainReservationHandlers } from "./domain-reservations.server";

// Reuse the verified request bearer/publishable transport; never a service-role client.
export const domainReservationHandlers = createDomainReservationHandlers(
  resolveRequestContext,
  (context, clinicId, after) => {
    const params = new URLSearchParams({
      clinic_id: `eq.${clinicId}`,
      select: "id,clinic_id,hostname,environment,status,revision,created_at",
      order: "hostname.asc,id.asc",
      limit: "101",
    });
    if (after) params.set("hostname", `gt.${after}`);
    return requestDatabaseQuery(context, `rest/v1/tm_clinic_domains?${params}`);
  },
  (context, input) =>
    requestDatabaseQuery(context, "rest/v1/rpc/tm_reserve_domain", {
      method: "POST",
      body: JSON.stringify({
        p_clinic_id: input.clinicId,
        p_hostname: input.hostname,
        p_environment: input.environment,
      }),
    }),
);
