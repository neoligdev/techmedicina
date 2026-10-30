import { createFileRoute } from "@tanstack/react-router";
import { handlePatientHydrationRequest } from "@/lib/hydration/patient-runtime-default.server";
export const Route = createFileRoute("/api/hydration/mutate")({
  server: { handlers: { POST: ({ request }) => handlePatientHydrationRequest("mutate", request) } },
});
