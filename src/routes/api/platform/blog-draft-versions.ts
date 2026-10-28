import { createFileRoute } from "@tanstack/react-router";
import { handleBlogVersionListRequest } from "@/lib/blog/version-list-runtime.server";
export const Route = createFileRoute("/api/platform/blog-draft-versions")({
  server: { handlers: { GET: ({ request }) => handleBlogVersionListRequest(request) } },
});
