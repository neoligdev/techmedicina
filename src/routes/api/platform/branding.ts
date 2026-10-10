import { createFileRoute } from "@tanstack/react-router";
import { clinicBrandingHandlers } from "@/lib/admin/clinic-branding-runtime.server";

export const Route = createFileRoute("/api/platform/branding")({
  server: {
    handlers: {
      GET: ({ request }) => clinicBrandingHandlers.GET(request),
      PUT: ({ request }) => clinicBrandingHandlers.PUT(request),
    },
  },
});
