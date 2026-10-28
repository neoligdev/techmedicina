import { createFileRoute } from "@tanstack/react-router";
import { handleContractVersionListRequest } from "@/lib/clinic-contracts/history-runtime.server";
export const Route = createFileRoute("/api/platform/clinic-contract-versions")({
  server: { handlers: { GET: ({ request }) => handleContractVersionListRequest(request) } },
});
