import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/platform/placeholder-page";
import { pageHead } from "@/features/demo/metadata";
export const Route = createFileRoute("/clinica/")({
  head: () => pageHead("Visão geral · clinica"),
  component: () => <PlaceholderPage title="Visão geral" />,
});
