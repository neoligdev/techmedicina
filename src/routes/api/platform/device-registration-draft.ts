import { createFileRoute } from "@tanstack/react-router";
import { handleDeviceRegistrationRequest } from "@/lib/devices/registration-runtime.server";
export const Route = createFileRoute("/api/platform/device-registration-draft")({
  server: {
    handlers: {
      GET: ({ request }) => handleDeviceRegistrationRequest(request),
      PUT: ({ request }) => handleDeviceRegistrationRequest(request),
    },
  },
});
