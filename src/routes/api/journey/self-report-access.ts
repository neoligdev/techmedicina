import { createFileRoute } from "@tanstack/react-router";
import { handlePatientJourneyRequest } from "@/lib/journey/patient-runtime-default.server";
export const Route = createFileRoute("/api/journey/self-report-access")({
  server: {
    handlers: { GET: ({ request }) => handlePatientJourneyRequest("selfReportAccess", request) },
  },
});
