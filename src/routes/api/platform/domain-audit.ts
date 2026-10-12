import { createFileRoute } from "@tanstack/react-router";
import { domainAuditResponse } from "@/lib/admin/domain-audit-runtime.server";
export const Route = createFileRoute("/api/platform/domain-audit")({
  server: { handlers: { GET: ({ request }) => domainAuditResponse(request) } },
});
