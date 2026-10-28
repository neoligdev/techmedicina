import "@tanstack/react-start/server-only";
import { resolveBrandingContext, query } from "../admin/clinic-branding-runtime.server";
import { createBlogDraftVersionEndpoint } from "./draft-version-endpoint.server";
export const handleBlogDraftVersionRequest = createBlogDraftVersionEndpoint({
  resolveSession: async () => resolveBrandingContext(),
  read: (session, args) =>
    query(session, "rest/v1/rpc/tm_get_blog_draft_version", {
      method: "POST",
      body: JSON.stringify(args),
    }),
});
