import { createFileRoute } from "@tanstack/react-router";
import { handleBlogDraftRequest } from "@/lib/blog/draft-runtime.server";
export const Route = createFileRoute("/api/platform/blog-draft")({
  server: {
    handlers: {
      GET: ({ request }) => handleBlogDraftRequest(request),
      PUT: ({ request }) => handleBlogDraftRequest(request),
    },
  },
});
