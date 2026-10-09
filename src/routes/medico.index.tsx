import { createFileRoute } from "@tanstack/react-router";
import { MedicoDashboard } from "@/components/platform/mockups/medico-dashboard";
import { pageHead } from "@/features/demo/metadata";
export const Route = createFileRoute("/medico/")({
  head: () => pageHead("Agenda · medico"),
  component: () => <MedicoDashboard />,
});
