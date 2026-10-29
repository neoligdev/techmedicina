import { createFileRoute } from "@tanstack/react-router";
import { handleDeviceRegistrationVersionListRequest } from "@/lib/devices/registration-version-list-runtime.server";
export const Route = createFileRoute("/api/platform/device-registration-versions")({
  server: {
    handlers: { GET: ({ request }) => handleDeviceRegistrationVersionListRequest(request) },
  },
});
