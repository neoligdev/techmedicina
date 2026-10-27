import { createFileRoute } from "@tanstack/react-router";
import { handlePatientJourneyRequest } from "@/lib/journey/patient-runtime-default.server";
export const Route = createFileRoute("/api/journey/participation")({
  server: {
    handlers: {
      GET: ({ request }) => handlePatientJourneyRequest("participationRead", request),
      PUT: ({ request }) => handlePatientJourneyRequest("participationSave", request),
    },
  },
});
