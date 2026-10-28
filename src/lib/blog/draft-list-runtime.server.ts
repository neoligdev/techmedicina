import "@tanstack/react-start/server-only";
import { resolveBrandingContext, query } from "../admin/clinic-branding-runtime.server";
import { createBlogDraftListEndpoint } from "./draft-list-endpoint.server";
export const handleBlogDraftListRequest = createBlogDraftListEndpoint({
  resolveSession: async () => resolveBrandingContext(),
  read: (session, args) =>
    query(session, "rest/v1/rpc/tm_list_blog_drafts", {
      method: "POST",
      body: JSON.stringify(args),
    }),
});
