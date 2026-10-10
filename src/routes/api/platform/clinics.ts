import { createFileRoute } from "@tanstack/react-router";
import { clinicDirectoryResponse } from "@/lib/admin/clinic-directory.server";
import { writePlatformClinic } from "@/lib/admin/clinic-write.server";

export const Route = createFileRoute("/api/platform/clinics")({
  server: {
    handlers: { GET: clinicDirectoryResponse, POST: ({ request }) => writePlatformClinic(request) },
  },
});
