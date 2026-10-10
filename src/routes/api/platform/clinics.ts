import { createFileRoute } from "@tanstack/react-router";
import { clinicDirectoryResponse } from "@/lib/admin/clinic-directory.server";

export const Route = createFileRoute("/api/platform/clinics")({
  server: { handlers: { GET: clinicDirectoryResponse } },
});
