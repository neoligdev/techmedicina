import "@tanstack/react-start/server-only";
import { resolveBrandingContext, query } from "../admin/clinic-branding-runtime.server";
import { createBlogDraftEndpoint } from "./draft-endpoint.server";
export const handleBlogDraftRequest = createBlogDraftEndpoint({
  resolveSession: async () => resolveBrandingContext(),
  rpc: (session, name, args) =>
    query(session, "rest/v1/rpc/" + name, { method: "POST", body: JSON.stringify(args) }),
});
