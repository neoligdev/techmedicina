import { createFileRoute } from "@tanstack/react-router";
import { handlePatientJourneyRequest } from "@/lib/journey/patient-runtime-default.server";
export const Route = createFileRoute("/api/journey/shields")({
  server: { handlers: { GET: ({ request }) => handlePatientJourneyRequest("shields", request) } },
});
