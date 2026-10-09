import { WorkspaceDashboard } from "./workspace-dashboard";
export function PacienteDashboard() {
  return (
    <WorkspaceDashboard
      area="app"
      eyebrow="SEU APLICATIVO"
      title="Meu dia"
      description="Um espaço para acompanhar sua rotina e seus cuidados."
      summary="Sua rotina aparecerá quando seus dados e orientações estiverem vinculados. Esta prévia não contém metas, prescrições ou avaliações de saúde pessoais."
      links={[
        {
          slug: "saude",
          title: "Minha saúde",
          description: "Conheça a organização do seu histórico.",
        },
        {
          slug: "protocolos",
          title: "Meus protocolos",
          description: "Acompanhe a estrutura dos cuidados orientados.",
        },
        {
          slug: "hidratacao",
          title: "Hidratação",
          description: "Explore o acompanhamento previsto para sua rotina.",
        },
        {
          slug: "habitos",
          title: "Hábitos",
          description: "Descubra o espaço para registros do dia a dia.",
        },
        {
          slug: "consulta",
          title: "Minha consulta",
          description: "Conheça o fluxo de preparação e acompanhamento.",
        },
        {
          slug: "beneficios",
          title: "Benefícios",
          description: "Explore as oportunidades previstas para seu plano.",
        },
      ]}
    />
  );
}
