import { createFileRoute } from "@tanstack/react-router";
import { auditDirectoryResponse } from "@/lib/admin/audit-directory.server";
export const Route = createFileRoute("/api/platform/audit")({
  server: { handlers: { GET: auditDirectoryResponse } },
});
