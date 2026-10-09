import { WorkspaceDashboard } from "./workspace-dashboard";
export function MedicoDashboard() {
  return (
    <WorkspaceDashboard
      area="medico"
      eyebrow="ESPAÇO MÉDICO"
      title="Cuidado em foco"
      description="Organize o atendimento com clareza e contexto."
      summary="Nenhuma agenda ou informação clínica real está vinculada nesta prévia. O atendimento requer identidade profissional verificada e acesso autorizado à clínica."
      links={[
        {
          slug: "consultas",
          title: "Consultas",
          description: "Conheça o fluxo de agenda e atendimento.",
        },
        {
          slug: "pacientes",
          title: "Pacientes",
          description: "Veja o paciente demonstrativo, a bioimpedância e os dados da pulseira.",
        },
        {
          slug: "exames",
          title: "Exames",
          description: "Conheça o fluxo de recebimento e revisão.",
        },
        {
          slug: "resumo",
          title: "Resumo clínico",
          description: "Veja as etapas previstas para revisão profissional.",
        },
        {
          slug: "mensagens",
          title: "Mensagens",
          description: "Explore a comunicação vinculada ao atendimento.",
        },
      ]}
    />
  );
}
