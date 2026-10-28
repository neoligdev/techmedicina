import { createFileRoute } from "@tanstack/react-router";
import { handleBlogDraftListRequest } from "@/lib/blog/draft-list-runtime.server";
export const Route = createFileRoute("/api/platform/blog-drafts")({
  server: { handlers: { GET: ({ request }) => handleBlogDraftListRequest(request) } },
});
