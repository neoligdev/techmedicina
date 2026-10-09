import { createFileRoute } from "@tanstack/react-router";
import { ClinicaDashboard } from "@/components/platform/mockups/clinica-dashboard";
import { pageHead } from "@/features/demo/metadata";
export const Route = createFileRoute("/clinica/")({
  head: () => pageHead("Visão geral · clinica"),
  component: () => <ClinicaDashboard />,
});
