import { createFileRoute, notFound } from "@tanstack/react-router";
import { ModulePage } from "@/components/platform/module-page";
import { navigation, areaLabels } from "@/features/demo/navigation";
import { pageHead } from "@/features/demo/metadata";
import { PlansCatalog } from "@/features/super-admin/plans";
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
  if (slug === "planos") {
    return <PlansCatalog />;
  }
  return <ModulePage area="super-admin" slug={slug} />;
}
