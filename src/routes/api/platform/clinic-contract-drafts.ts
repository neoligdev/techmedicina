import { createFileRoute } from "@tanstack/react-router";
import { handleClinicContractListRequest } from "@/lib/clinic-contracts/list-runtime.server";
export const Route = createFileRoute("/api/platform/clinic-contract-drafts")({
  server: { handlers: { GET: ({ request }) => handleClinicContractListRequest(request) } },
});
