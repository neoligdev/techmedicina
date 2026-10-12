import { createFileRoute } from "@tanstack/react-router";
import { domainReservationHandlers } from "@/lib/admin/domain-reservations-runtime.server";
export const Route = createFileRoute("/api/platform/domains")({
  server: {
    handlers: {
      GET: ({ request }) => domainReservationHandlers.GET(request),
      POST: ({ request }) => domainReservationHandlers.POST(request),
    },
  },
});
