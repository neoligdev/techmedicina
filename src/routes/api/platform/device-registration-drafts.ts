import { createFileRoute } from "@tanstack/react-router";
import { handleDeviceRegistrationListRequest } from "@/lib/devices/registration-list-runtime.server";
export const Route = createFileRoute("/api/platform/device-registration-drafts")({
  server: { handlers: { GET: ({ request }) => handleDeviceRegistrationListRequest(request) } },
});
