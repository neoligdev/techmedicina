import "@tanstack/react-start/server-only";
import { resolveBrandingContext, query } from "../admin/clinic-branding-runtime.server";
import { createDeviceRegistrationListEndpoint } from "./registration-list-endpoint.server";
export const handleDeviceRegistrationListRequest = createDeviceRegistrationListEndpoint({
  resolveSession: async () => resolveBrandingContext(),
  read: (session, args) =>
    query(session, "rest/v1/rpc/tm_list_device_registration_drafts", {
      method: "POST",
      body: JSON.stringify(args),
    }),
});
