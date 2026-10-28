import { createFileRoute } from "@tanstack/react-router";
import { handleClinicContractDraftRequest } from "@/lib/clinic-contracts/draft-runtime.server";
export const Route = createFileRoute("/api/platform/clinic-contract-draft")({
  server: {
    handlers: {
      GET: ({ request }) => handleClinicContractDraftRequest(request),
      PUT: ({ request }) => handleClinicContractDraftRequest(request),
    },
  },
});
