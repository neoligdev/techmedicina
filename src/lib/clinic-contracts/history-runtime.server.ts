import "@tanstack/react-start/server-only";
import { resolveBrandingContext, query } from "../admin/clinic-branding-runtime.server";
import { createContractVersionEndpoint } from "./version-endpoint.server";
import { createContractVersionListEndpoint } from "./version-list-endpoint.server";
export const handleContractVersionRequest = createContractVersionEndpoint({
  resolveSession: async () => resolveBrandingContext(),
  read: (session, args) =>
    query(session, "rest/v1/rpc/tm_get_clinic_contract_draft_version", {
      method: "POST",
      body: JSON.stringify(args),
    }),
});
export const handleContractVersionListRequest = createContractVersionListEndpoint({
  resolveSession: async () => resolveBrandingContext(),
  read: (session, args) =>
    query(session, "rest/v1/rpc/tm_list_clinic_contract_draft_versions", {
      method: "POST",
      body: JSON.stringify(args),
    }),
});
