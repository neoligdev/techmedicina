import { createFileRoute } from "@tanstack/react-router";
import { agendaAvailabilityHandlers } from "@/lib/agenda/availability-runtime.server";

export const Route = createFileRoute("/api/agenda/clinic")({
  server: {
    handlers: {
      GET: ({ request }) => agendaAvailabilityHandlers.GET_CLINIC_CONTEXT(request),
    },
  },
});
