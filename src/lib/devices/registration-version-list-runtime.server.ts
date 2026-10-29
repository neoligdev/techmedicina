import "@tanstack/react-start/server-only";
import { resolveBrandingContext, query } from "../admin/clinic-branding-runtime.server";
import { createDeviceRegistrationVersionListEndpoint } from "./registration-version-list-endpoint.server";
export const handleDeviceRegistrationVersionListRequest =
  createDeviceRegistrationVersionListEndpoint({
    resolveSession: async () => resolveBrandingContext(),
    read: (session, args) =>
      query(session, "rest/v1/rpc/tm_list_device_registration_draft_versions", {
        method: "POST",
        body: JSON.stringify(args),
      }),
  });
