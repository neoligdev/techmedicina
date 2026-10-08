export function pageHead(title: string) {
  const fullTitle = `${title} — PlugPix Techmedicina`;
  const description = `${title} na demonstração administrativa da PlugPix Techmedicina. Plataforma de gestão e cuidado em saúde.`;
  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: description },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
