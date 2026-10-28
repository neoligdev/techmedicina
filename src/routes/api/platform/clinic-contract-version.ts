import { createFileRoute } from "@tanstack/react-router";
import { handleContractVersionRequest } from "@/lib/clinic-contracts/history-runtime.server";
export const Route = createFileRoute("/api/platform/clinic-contract-version")({
  server: { handlers: { GET: ({ request }) => handleContractVersionRequest(request) } },
});
