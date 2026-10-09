import { createFileRoute, notFound } from "@tanstack/react-router";
import { ModulePage } from "@/components/platform/module-page";
import { navigation, areaLabels } from "@/features/demo/navigation";
import { pageHead } from "@/features/demo/metadata";
export const Route = createFileRoute("/medico/$section")({
  loader: ({ params }) => {
    const item = navigation["medico"].find(
      (item) => item.slug === params.section && item.slug !== "",
    );
    if (!item) throw notFound();
    return { title: item.label, slug: item.slug };
  },
  head: ({ loaderData }) =>
    pageHead(`${loaderData?.title ?? "Página indisponível"} · ${areaLabels["medico"]}`),
  component: SectionPage,
});
function SectionPage() {
  const { slug } = Route.useLoaderData();
  return <ModulePage area="medico" slug={slug} />;
}
