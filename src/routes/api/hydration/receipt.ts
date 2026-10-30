import { createFileRoute } from "@tanstack/react-router";
import { handlePatientHydrationRequest } from "@/lib/hydration/patient-runtime-default.server";
export const Route = createFileRoute("/api/hydration/receipt")({
  server: { handlers: { GET: ({ request }) => handlePatientHydrationRequest("receipt", request) } },
});
