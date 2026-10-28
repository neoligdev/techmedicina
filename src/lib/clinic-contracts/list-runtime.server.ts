import "@tanstack/react-start/server-only";
import { resolveBrandingContext, query } from "../admin/clinic-branding-runtime.server";
import { createClinicContractListEndpoint } from "./list-endpoint.server";
export const handleClinicContractListRequest = createClinicContractListEndpoint({
  resolveSession: async () => resolveBrandingContext(),
  read: (session, args) =>
    query(session, "rest/v1/rpc/tm_list_clinic_contract_drafts", {
      method: "POST",
      body: JSON.stringify(args),
    }),
});
