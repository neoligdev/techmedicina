import { createFileRoute } from "@tanstack/react-router";
import { handlePatientHydrationRequest } from "@/lib/hydration/patient-runtime-default.server";
export const Route = createFileRoute("/api/hydration/preferences")({
  server: {
    handlers: {
      GET: ({ request }) => handlePatientHydrationRequest("preferences", request),
      POST: ({ request }) => handlePatientHydrationRequest("preferences", request),
    },
  },
});
