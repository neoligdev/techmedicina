import "@tanstack/react-start/server-only";
import { resolveBrandingContext, query } from "../admin/clinic-branding-runtime.server";
import { createDeviceRegistrationVersionEndpoint } from "./registration-version-endpoint.server";
export const handleDeviceRegistrationVersionRequest = createDeviceRegistrationVersionEndpoint({
  resolveSession: async () => resolveBrandingContext(),
  read: (session, args) =>
    query(session, "rest/v1/rpc/tm_get_device_registration_draft_version", {
      method: "POST",
      body: JSON.stringify(args),
    }),
});
