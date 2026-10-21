import { createFileRoute, notFound } from "@tanstack/react-router";
import { ModulePage } from "@/components/platform/module-page";
import { navigation, areaLabels } from "@/features/demo/navigation";
import { pageHead } from "@/features/demo/metadata";
import { PlansCatalog } from "@/features/super-admin/plans";
import { SimulatorPage } from "@/features/super-admin/simulator";
import { ShieldsLibraryPage } from "@/features/super-admin/shields";
import { DomainsPage } from "@/features/super-admin/domains";

export const Route = createFileRoute("/super-admin/$section")({
  loader: ({ params }) => {
    const item = navigation["super-admin"].find(
      (item) => item.slug === params.section && item.slug !== "",
    );
    if (!item) throw notFound();
    return { title: item.label, slug: item.slug };
  },
  head: ({ loaderData }) =>
    pageHead(`${loaderData?.title ?? "Página indisponível"} · ${areaLabels["super-admin"]}`),
  component: SectionPage,
});

function SectionPage() {
  const { slug } = Route.useLoaderData();
  if (slug === "dominios") {
    return <DomainsPage />;
  }
  if (slug === "planos") {
    return <PlansCatalog defaultTab="policies" />;
  }
  if (slug === "simulador") {
    return <SimulatorPage />;
  }
  if (slug === "escudos") {
    return <ShieldsLibraryPage />;
  }
  return <ModulePage area="super-admin" slug={slug} />;
}
