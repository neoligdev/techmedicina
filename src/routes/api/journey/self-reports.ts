import { createFileRoute } from "@tanstack/react-router";
import { handlePatientJourneyRequest } from "@/lib/journey/patient-runtime-default.server";
export const Route = createFileRoute("/api/journey/self-reports")({
  server: {
    handlers: { GET: ({ request }) => handlePatientJourneyRequest("selfReportHistory", request) },
  },
});
