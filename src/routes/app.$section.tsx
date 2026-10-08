import { createFileRoute, notFound } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/platform/placeholder-page";
import { navigation, areaLabels } from "@/features/demo/navigation";
import { pageHead } from "@/features/demo/metadata";
export const Route = createFileRoute("/app/$section")({
  loader: ({ params }) => {
    const item = navigation["app"].find((item) => item.slug === params.section && item.slug !== "");
    if (!item) throw notFound();
    return { title: item.label };
  },
  head: ({ loaderData }) =>
    pageHead(`${loaderData?.title ?? "Página indisponível"} · ${areaLabels["app"]}`),
  component: SectionPage,
});
function SectionPage() {
  const { title } = Route.useLoaderData();
  return <PlaceholderPage title={title} />;
}
