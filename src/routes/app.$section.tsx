import { createFileRoute, notFound } from "@tanstack/react-router";
import { ModulePage } from "@/components/platform/module-page";
import { navigation, areaLabels } from "@/features/demo/navigation";
import { pageHead } from "@/features/demo/metadata";
import { MyShields } from "@/features/journey/my-shields";

export const Route = createFileRoute("/app/$section")({
  loader: ({ params }) => {
    const item = navigation["app"].find((item) => item.slug === params.section && item.slug !== "");
    if (!item) throw notFound();
    return { title: item.label, slug: item.slug };
  },
  head: ({ loaderData }) =>
    pageHead(`${loaderData?.title ?? "Página indisponível"} · ${areaLabels["app"]}`),
  component: SectionPage,
});

function SectionPage() {
  const { slug } = Route.useLoaderData();
  if (slug === "escudos") return <MyShields />;
  return <ModulePage area="app" slug={slug} />;
}
