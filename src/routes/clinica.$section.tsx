import { createFileRoute, notFound } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/platform/placeholder-page";
import { PersonalizationPage } from "@/components/platform/personalization-page";
import { navigation, areaLabels } from "@/features/demo/navigation";
import { pageHead } from "@/features/demo/metadata";
export const Route = createFileRoute("/clinica/$section")({
  loader: ({ params }) => {
    const item = navigation["clinica"].find(
      (item) => item.slug === params.section && item.slug !== "",
    );
    if (!item) throw notFound();
    return { title: item.label };
  },
  head: ({ loaderData }) =>
    pageHead(`${loaderData?.title ?? "Página indisponível"} · ${areaLabels["clinica"]}`),
  component: SectionPage,
});
function SectionPage() {
  const { title } = Route.useLoaderData();
  const { section } = Route.useParams();
  if (section === "personalizacao") return <PersonalizationPage />;
  return <PlaceholderPage title={title} />;
}
