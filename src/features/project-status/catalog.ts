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
export const updatedAt = "12/10/2026"; // C040: reserva Cloud, persistência e RLS verificadas.
export const statusItems = catalog.items as StatusItem[];
export const deliveries = catalog.deliveries as StatusItem[];
export function projectProgress(items: StatusItem[]) {
  const leaves = items.filter((item) => !items.some((child) => child.parent === item.id));
  const total = leaves.length;
  const completed = leaves.filter((item) => item.status === "done").length;
  const started = leaves.filter((item) => item.status !== "pending").length;
  return {
    total,
    completed,
    started,
    completedPercent: total ? Math.round((completed / total) * 100) : 0,
    startedPercent: total ? Math.round((started / total) * 100) : 0,
  };
}
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
