import catalog from "./catalog.json";

export type ProjectStatus = "done" | "progress" | "pending";
export interface StatusItem {
  id: string;
  title: string;
  parent: string | null;
  status: ProjectStatus;
  done: string;
  next: string;
  authors: string[];
  requirements: string[];
}
export const updatedAt = "10/10/2026"; // C013: aplicação Cloud verificada por Lovable nesta data.
export const statusItems = catalog.items as StatusItem[];
export const deliveries = catalog.deliveries as StatusItem[];
export const statusLabels: Record<ProjectStatus, string> = {
  done: "Concluído no escopo descrito",
  progress: "Em implementação / parcial",
  pending: "Não implementado / pendente",
};
export function filterStatusItems(items: StatusItem[], query: string, status: string) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const term = normalize(query.trim());
  return items.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      normalize(
        [item.id, item.title, item.done, item.next, ...item.authors, ...item.requirements].join(
          " ",
        ),
      ).includes(term),
  );
}
