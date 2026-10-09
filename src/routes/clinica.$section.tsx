import { createFileRoute, notFound } from "@tanstack/react-router";
import { ModulePage } from "@/components/platform/module-page";
import { PersonalizationPage } from "@/components/platform/personalization-page";
import { navigation, areaLabels } from "@/features/demo/navigation";
import { pageHead } from "@/features/demo/metadata";
export const Route = createFileRoute("/clinica/$section")({
  loader: ({ params }) => {
    const item = navigation["clinica"].find(
      (item) => item.slug === params.section && item.slug !== "",
    );
    if (!item) throw notFound();
    return { title: item.label, slug: item.slug };
  },
  head: ({ loaderData }) =>
    pageHead(`${loaderData?.title ?? "Página indisponível"} · ${areaLabels["clinica"]}`),
  component: SectionPage,
});
function SectionPage() {
  const { slug } = Route.useLoaderData();
  if (slug === "personalizacao") return <PersonalizationPage />;
  return <ModulePage area="clinica" slug={slug} />;
}
