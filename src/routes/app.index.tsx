import { createFileRoute } from "@tanstack/react-router";
import { PacienteDashboard } from "@/components/platform/mockups/paciente-dashboard";
import { pageHead } from "@/features/demo/metadata";
export const Route = createFileRoute("/app/")({
  head: () => pageHead("Meu dia · app"),
  component: () => <PacienteDashboard />,
});
