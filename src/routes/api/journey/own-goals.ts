import { createFileRoute } from "@tanstack/react-router";
import { handlePatientJourneyRequest } from "@/lib/journey/patient-runtime-default.server";
export const Route = createFileRoute("/api/journey/own-goals")({
  server: { handlers: { GET: ({ request }) => handlePatientJourneyRequest("ownGoals", request) } },
});
