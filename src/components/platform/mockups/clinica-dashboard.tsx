import { useDemoClinic } from "@/features/demo/context";
import { WorkspaceDashboard } from "./workspace-dashboard";
export function ClinicaDashboard() {
  const { clinic } = useDemoClinic();
  return (
    <WorkspaceDashboard
      area="clinica"
      eyebrow="GESTÃO DA CLÍNICA"
      title={clinic.name}
      description="Uma visão clara para organizar sua operação."
      summary={`${clinic.enabledLives.toLocaleString("pt-BR")} vidas habilitadas nos dados demonstrativos. Indicadores de operação e faturamento aguardam dados reais e regras aprovadas.`}
      links={[
        {
          slug: "pacientes",
          title: "Pacientes",
          description: "Organize vínculos e informações administrativas.",
        },
        {
          slug: "crm",
          title: "Relacionamento",
          description: "Explore a organização do acompanhamento comercial.",
        },
        {
          slug: "protocolos",
          title: "Protocolos",
          description: "Conheça a estrutura e as etapas de aprovação.",
        },
        {
          slug: "jornadas",
          title: "Jornadas",
          description: "Visualize etapas para acompanhar cada jornada.",
        },
        {
          slug: "equipe",
          title: "Equipe",
          description: "Consulte a estrutura de perfis e permissões.",
        },
        {
          slug: "personalizacao",
          title: "Sua identidade",
          description: "Personalize a aparência desta clínica.",
        },
      ]}
    />
  );
}
