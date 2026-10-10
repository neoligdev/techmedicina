const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const catalog = JSON.parse(
  fs.readFileSync(path.join(root, "src/features/project-status/catalog.json"), "utf8"),
);
const date = fs
  .readFileSync(path.join(root, "src/features/project-status/catalog.ts"), "utf8")
  .match(/updatedAt = "([^"]+)"/)[1];
const labels = {
  done: "Concluído no escopo descrito",
  progress: "Em implementação / parcial",
  pending: "Não implementado / pendente",
};
const icons = { done: "🟢", progress: "🔵", pending: "🟡" };
const render = (item) => {
  const lines = [
    `## ${item.id} - ${item.title} ${icons[item.status]}`,
    "",
    `- **Status**: ${icons[item.status]} ${labels[item.status]}`,
    `- **Autores**: ${item.authors.join(", ") || "Sem implementação"}`,
    `- **Entregue**: ${item.done}`,
    `- **Próximo Passo**: ${item.next}`,
    "",
  ];
  if (item.requirements.length)
    lines.push(
      "**Requisitos**:",
      "",
      ...item.requirements.map((requirement) => `- ${requirement}`),
      "",
    );
  return lines.join("\n");
};
const document = [
  `# Status Temporário do Projeto`,
  "",
  `Atualizado em ${date}. Gerado a partir do catálogo; verde descreve somente o escopo entregue.`,
  "",
  ...catalog.items.map(render),
  "# Entregas validadas",
  "",
  ...catalog.deliveries.map(render),
].join("\n");
fs.writeFileSync(path.join(root, "docs/STATUS_PROJETO_TEMPORARIO.md"), document + "\n", "utf8");
console.log(`Status: ${catalog.items.length} itens, ${catalog.deliveries.length} entregas.`);
