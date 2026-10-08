export type Area = "super-admin" | "clinica" | "medico" | "app";
export type ClinicTheme = "verde" | "azul";
export interface Clinic {
  id: string;
  name: string;
  initials: string;
  status: "Ativa" | "Em implantação";
  enabledLives: number;
  theme: ClinicTheme;
}
export interface NavigationItem {
  slug: string;
  label: string;
  icon:
    | "palette"
    | "building"
    | "doctors"
    | "users"
    | "plans"
    | "devices"
    | "finance"
    | "overview"
    | "protocols"
    | "sales"
    | "integrations"
    | "calendar"
    | "consultations"
    | "day"
    | "health"
    | "benefits";
}
