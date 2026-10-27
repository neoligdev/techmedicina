import { createFileRoute } from "@tanstack/react-router";
import { handlePatientJourneyRequest } from "@/lib/journey/patient-runtime-default.server";
export const Route = createFileRoute("/api/journey/context")({
  server: { handlers: { GET: ({ request }) => handlePatientJourneyRequest("context", request) } },
});
