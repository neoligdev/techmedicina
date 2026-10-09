import type { Area, NavigationItem } from "./types";
import { moduleCatalog } from "./module-catalog";
export const areaLabels: Record<Area, string> = {
  "super-admin": "Super ADM",
  clinica: "Clínica",
  medico: "Médico",
  app: "Paciente",
};

export const navigation: Record<Area, NavigationItem[]> = {
  "super-admin": [
    { slug: "", label: "Clínicas", icon: "building" },
    { slug: "medicos", label: "Médicos", icon: "doctors" },
    { slug: "clientes", label: "Clientes", icon: "users" },
    { slug: "planos", label: "Planos", icon: "plans" },
    { slug: "dispositivos", label: "Dispositivos", icon: "devices" },
    { slug: "financeiro", label: "Financeiro", icon: "finance" },
    { slug: "inovacoes", label: "Inovações", icon: "sparkles", group: "Configurações" },
    { slug: "privacidade", label: "Privacidade", icon: "shield", group: "Configurações" },
  ],
  clinica: [
    { slug: "", label: "Visão geral", icon: "overview" },
    { slug: "pacientes", label: "Pacientes", icon: "users", group: "Gestão" },
    { slug: "equipe", label: "Equipe", icon: "doctors", group: "Gestão" },
    { slug: "planos-produtos", label: "Planos & Produtos", icon: "plans", group: "Gestão" },
    { slug: "crm", label: "CRM", icon: "users", group: "Comercial" },
    { slug: "vendas", label: "Vendas", icon: "sales", group: "Comercial" },
    { slug: "comissoes", label: "Comissões", icon: "finance", group: "Comercial" },
    { slug: "protocolos", label: "Protocolos", icon: "protocols", group: "Clínico" },
    { slug: "dispositivos", label: "Dispositivos", icon: "devices", group: "Clínico" },
    { slug: "integracoes", label: "Integrações", icon: "integrations", group: "Configurações" },
    { slug: "personalizacao", label: "Personalização", icon: "palette", group: "Configurações" },
  ],
  medico: [
    { slug: "", label: "Agenda", icon: "calendar" },
    { slug: "pacientes", label: "Pacientes", icon: "users", group: "Atendimento" },
    { slug: "consultas", label: "Consultas", icon: "consultations", group: "Atendimento" },
  ],
  app: [
    { slug: "", label: "Meu dia", icon: "day" },
    { slug: "saude", label: "Saúde", icon: "health", group: "Acompanhamento" },
    { slug: "bioimpedancia", label: "Bioimpedância", icon: "activity", group: "Acompanhamento" },
    { slug: "protocolos", label: "Protocolos", icon: "protocols", group: "Acompanhamento" },
    { slug: "blog", label: "Blog", icon: "book", group: "Conteúdo" },

    { slug: "beneficios", label: "Benefícios", icon: "benefits", group: "Serviços" },
    { slug: "dependentes", label: "Dependentes", icon: "users", group: "Serviços" },
    { slug: "financeiro", label: "Financeiro", icon: "finance", group: "Serviços" },
    { slug: "indicacoes", label: "Indicações", icon: "share", group: "Serviços" },
  ],
};

for (const module of moduleCatalog) {
  const existing = navigation[module.area].find((item) => item.slug === module.slug);
  if (existing) existing.group = module.group;
  else
    navigation[module.area].push({
      slug: module.slug,
      label: module.title,
      group: module.group,
      icon: module.icon,
    });
}
