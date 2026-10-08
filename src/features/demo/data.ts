import type { Clinic } from "./types";
export const clinics: Clinic[] = [
  {
    id: "clinica-viva",
    name: "Clínica Viva Saúde",
    initials: "VS",
    status: "Ativa",
    enabledLives: 1248,
    theme: "verde",
  },
  {
    id: "clinica-horizonte",
    name: "Clínica Horizonte",
    initials: "CH",
    status: "Em implantação",
    enabledLives: 320,
    theme: "azul",
  },
];
export function filterClinics(query: string, items: Clinic[] = clinics) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  return items.filter((clinic) => normalize(clinic.name).includes(normalize(query.trim())));
}
