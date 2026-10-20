import { createFileRoute } from "@tanstack/react-router";
import { agendaAvailabilityHandlers } from "@/lib/agenda/availability-runtime.server";

export const Route = createFileRoute("/api/agenda/availability")({
  server: {
    handlers: {
      GET: ({ request }) => agendaAvailabilityHandlers.GET(request),
      POST: ({ request }) => agendaAvailabilityHandlers.POST(request),
    },
  },
});
