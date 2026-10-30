import { createFileRoute } from "@tanstack/react-router";
import { handlePatientHydrationRequest } from "@/lib/hydration/patient-runtime-default.server";
export const Route = createFileRoute("/api/hydration/context")({
  server: { handlers: { GET: ({ request }) => handlePatientHydrationRequest("context", request) } },
});
