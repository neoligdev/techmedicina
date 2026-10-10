import { createFileRoute } from "@tanstack/react-router";
import { clinicDetailResponse } from "@/lib/admin/clinic-detail.server";
export const Route = createFileRoute("/api/platform/clinic")({
  server: { handlers: { GET: ({ request }) => clinicDetailResponse(request) } },
});
