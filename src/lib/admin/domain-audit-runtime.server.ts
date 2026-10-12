import "@tanstack/react-start/server-only";
import { resolveBrandingContext, query } from "./clinic-branding-runtime.server";
import { createDomainAudit } from "./domain-audit.server";
export const domainAuditResponse = createDomainAudit(
  resolveBrandingContext,
  (context, clinicId, domainId) => {
    const params = new URLSearchParams({
      clinic_id: `eq.${clinicId}`,
      id: `eq.${domainId}`,
      select: "id,clinic_id,hostname,environment,status,revision,created_at",
      limit: "2",
    });
    return query(context, `rest/v1/tm_clinic_domains?${params}`);
  },
  (context, domainId, cursor) => {
    const params = new URLSearchParams({
      domain_id: `eq.${domainId}`,
      select: "id,domain_id,actor_user_id,action,occurred_at",
      order: "occurred_at.desc,id.desc",
      limit: "101",
    });
    if (cursor)
      params.set(
        "or",
        `(occurred_at.lt.${cursor.before},and(occurred_at.eq.${cursor.before},id.lt.${cursor.beforeId}))`,
      );
    return query(context, `rest/v1/tm_domain_audit?${params}`);
  },
);
