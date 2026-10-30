import { createFileRoute } from "@tanstack/react-router";
import { handlePatientHydrationRequest } from "@/lib/hydration/patient-runtime-default.server";
export const Route = createFileRoute("/api/hydration/records")({
  server: { handlers: { GET: ({ request }) => handlePatientHydrationRequest("records", request) } },
});
