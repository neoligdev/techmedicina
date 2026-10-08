import { createFileRoute } from "@tanstack/react-router";
import { ClinicsPage } from "@/components/platform/clinics-page";
import { pageHead } from "@/features/demo/metadata";
export const Route = createFileRoute("/super-admin/")({
  head: () => pageHead("Clínicas · super-admin"),
  component: ClinicsPage,
});
