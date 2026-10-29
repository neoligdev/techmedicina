import { createFileRoute } from "@tanstack/react-router";
import { handleDeviceRegistrationVersionRequest } from "@/lib/devices/registration-version-runtime.server";
export const Route = createFileRoute("/api/platform/device-registration-version")({
  server: { handlers: { GET: ({ request }) => handleDeviceRegistrationVersionRequest(request) } },
});
