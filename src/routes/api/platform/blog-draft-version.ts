import { createFileRoute } from "@tanstack/react-router";
import { handleBlogDraftVersionRequest } from "@/lib/blog/draft-version-runtime.server";
export const Route = createFileRoute("/api/platform/blog-draft-version")({
  server: { handlers: { GET: ({ request }) => handleBlogDraftVersionRequest(request) } },
});
