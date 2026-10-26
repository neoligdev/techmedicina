import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MyShields } from "@/features/journey/my-shields";
import { SHIELD_TIERS } from "@/features/journey/contracts";
import { shouldEnablePatientDemo } from "@/features/demo/demo-authorization";
afterEach(cleanup);
const clinicId = "11111111-1111-4111-8111-111111111111",
  patientId = "22222222-2222-4222-8222-222222222222";
const state = {
  clinicId,
  patientId,
  activeShield: "origem",
  highestShieldEarned: "ritmo",
  isProvisional: false,
  scoreAverage: 20,
  scoreAverageRounded: 20,
  evaluableDaysCount: 7,
  consecutiveLowDays: 3,
  lastEvaluatedDate: "2026-10-14",
  evaluatedAt: "2026-10-14T12:00:00Z",
  rulesVersion: "v0.11.3",
  recentAction: "regression",
  reason: "QA",
};
const event = {
  id: clinicId,
  clinicId,
  patientId,
  action: "promotion",
  shield: "ritmo",
  previousShield: "origem",
  highestShieldEarned: "ritmo",
  evaluatedDate: "2026-10-10",
  occurredAt: "2026-10-10T12:00:00Z",
  scoreAverage: 40,
  evaluableDaysCount: 7,
  consecutiveLowDays: 0,
  vitalitySnapshot: null,
  rulesVersion: "v0.11.3",
  reason: "QA",
};
const overview = {
  clinicId,
  patientId,
  state,
  history: [event],
  tierInfo: SHIELD_TIERS.origem,
  nextTier: SHIELD_TIERS.ritmo,
  progress: {
    currentRank: 1,
    nextTierId: "ritmo",
    nextTierName: "Ritmo",
    nextTierMinScore: 30,
    pointsNeededToNextTier: 10,
    progressPercentage: 66,
    daysRemainingInWindow: 0,
    consecutiveLowDays: 3,
    isAtRiskOfRegression: false,
  },
};
it("keeps past conquest after regression with timezone and progress", () => {
  render(<MyShields overview={overview} clinicId={clinicId} patientId={patientId} />);
  expect(screen.getByText("Escudo ativo: Origem")).toBeInTheDocument();
  expect(screen.getByText("Conquistado")).toBeInTheDocument();
  expect(screen.getByText(/10\/10\/2026.*09:00.*America\/Bahia/)).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "66");
  expect(screen.getAllByText("VITALIDADE: indisponível/não calculada.")).toHaveLength(2);
});
it.each([
  { ...overview, patientId: clinicId },
  { ...overview, state: { ...state, clinicId: patientId } },
  { ...overview, history: [{ ...event, patientId: clinicId }] },
])("rejects foreign scope at every level", (payload) => {
  render(<MyShields overview={payload} clinicId={clinicId} patientId={patientId} />);
  expect(screen.queryByText("JORNADA: 40")).not.toBeInTheDocument();
  expect(screen.getByText(/Nenhum histórico autorizado/)).toBeInTheDocument();
});
it("provisional state shows no invented progress", () => {
  render(
    <MyShields
      overview={{
        ...overview,
        state: { ...state, isProvisional: true, scoreAverage: null, scoreAverageRounded: null },
      }}
      clinicId={clinicId}
      patientId={patientId}
    />,
  );
  expect(screen.getByText("JORNADA: indisponível")).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
it("does not assign scores or achievements without authorized data", () => {
  render(<MyShields />);
  expect(screen.getByRole("heading", { name: "Meus Escudos" })).toBeInTheDocument();
  expect(screen.getByText(/Nenhum histórico autorizado/)).toBeInTheDocument();
  expect(screen.queryByText(/Escudo ativo:/)).not.toBeInTheDocument();
});
it("rejects malformed payload before showing data", () => {
  render(<MyShields overview={{ clinicId: "other", state: { scoreAverage: 95 } }} />);
  expect(screen.getByText(/Nenhum histórico autorizado/)).toBeInTheDocument();
  expect(screen.queryByText(/95 pontos/)).not.toBeInTheDocument();
});

it("renderiza a galeria dos 5 escudos canônicos com faixas e permite abrir detalhes interativos", () => {
  render(<MyShields overview={overview} clinicId={clinicId} patientId={patientId} />);

  // Título da Galeria de Escudos
  expect(screen.getByRole("heading", { name: "Galeria de Escudos" })).toBeInTheDocument();

  // Os 5 Escudos canônicos do PRD §11.5
  expect(screen.getByRole("heading", { name: "Origem" })).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { name: "Ritmo" }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole("heading", { name: "Avanço" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Equilíbrio" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Plenitude" })).toBeInTheDocument();

  // Faixas oficiais de pontuação exibidas
  expect(screen.getAllByText("0–29 pts").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("30–54 pts").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("55–74 pts").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("75–89 pts").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("90–100 pts").length).toBeGreaterThanOrEqual(1);

  // Status dos escudos
  expect(screen.getByText("Ativo")).toBeInTheDocument();
  expect(screen.getByText("Conquistado")).toBeInTheDocument();
  expect(screen.getByText("Próximo objetivo")).toBeInTheDocument();

  // Interatividade: abrir modal de detalhes ao clicar no card de Avanço
  const avancoCard = screen.getByRole("button", { name: /Ver detalhes do escudo Avanço/i });
  fireEvent.click(avancoCard);

  // Modal com significado e requisitos
  expect(screen.getByRole("heading", { name: "Escudo Avanço" })).toBeInTheDocument();
  expect(screen.getByText(/Nível 3 da JORNADA/i)).toBeInTheDocument();
  expect(
    screen.getByText(/Evolução sustentada com superação consistente das metas acordadas/i),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Manter média de 55 a 74 pontos na janela móvel de 7 dias avaliáveis/i),
  ).toBeInTheDocument();

  // Fechar modal
  const fecharBtn = screen.getByRole("button", { name: "Fechar" });
  fireEvent.click(fecharBtn);
  expect(screen.queryByRole("heading", { name: "Escudo Avanço" })).not.toBeInTheDocument();
});

it("quando o histórico de conquistas é vazio, exibe o estado vazio oficial sem erro", () => {
  const emptyHistoryOverview = {
    ...overview,
    history: [],
  };
  render(<MyShields overview={emptyHistoryOverview} clinicId={clinicId} patientId={patientId} />);

  expect(screen.getByText("Histórico de conquistas")).toBeInTheDocument();
  expect(screen.getByText("Nenhuma conquista registrada.")).toBeInTheDocument();
});

it("preserva o maior escudo conquistado e exibe a regra de transição descendente de 3 dias", () => {
  render(<MyShields overview={overview} clinicId={clinicId} patientId={patientId} />);

  // Nota de proteção do histórico (PRD §11.5)
  expect(screen.getByText(/Regra de Proteção do Histórico/i)).toBeInTheDocument();
  expect(
    screen.getByText(
      /Uma transição descendente só ocorre após 3 avaliações diárias consecutivas abaixo do limiar/i,
    ),
  ).toBeInTheDocument();
  expect(screen.getByText(/maior escudo já conquistado \(Ritmo\)/i)).toBeInTheDocument();
});

it("exibe perfil demonstrativo oficial do Alex quando isDemo=true", () => {
  render(<MyShields isDemo={true} />);

  // Cabeçalho indica demonstração
  expect(screen.getByText("Perfil demonstrativo")).toBeInTheDocument();

  // Dados oficiais simulados de Alex
  expect(screen.getByText("Escudo ativo: Ritmo")).toBeInTheDocument();
  expect(screen.getByText(/JORNADA:\s*42\s*pontos/i)).toBeInTheDocument();
  expect(screen.getByText(/7 dias avaliáveis na janela/i)).toBeInTheDocument();
  expect(screen.getByText(/Próximo escudo: Avanço/i)).toBeInTheDocument();
  expect(screen.getByText(/13 pontos até o próximo nível/i)).toBeInTheDocument();

  // Histórico demonstrativo com dois marcos
  expect(screen.getByText("Promoção")).toBeInTheDocument();
  expect(screen.getByText("Conquista Inicial")).toBeInTheDocument();
});

it("restringe modo demonstrativo quando há usuário autenticado ou em ambiente de produção", () => {
  // Com usuário autenticado, nunca permite demonstração
  expect(shouldEnablePatientDemo(true)).toBe(false);

  // Sem sessão em produção (null / não autorizado), não permite
  expect(shouldEnablePatientDemo(null)).toBe(false);
});

it("garante isolamento estrito entre clínicas distintas", () => {
  const foreignClinicId = "99999999-9999-4999-8999-999999999999";

  // Usuário tenta acessar overview pertencente a outra clínica
  render(<MyShields overview={overview} clinicId={foreignClinicId} patientId={patientId} />);

  // Deve rejeitar imediatamente e não exibir pontuação
  expect(screen.getByText(/Nenhum histórico autorizado foi carregado/i)).toBeInTheDocument();
  expect(screen.queryByText("Escudo ativo: Origem")).not.toBeInTheDocument();
});

it("D124: MyShields exibe estado de loading aguardando dados do servidor", () => {
  render(<MyShields status="loading" />);
  expect(screen.getByText("Aguardando dados do servidor…")).toBeInTheDocument();
  expect(screen.getByText("Conheça os 5 Escudos da JORNADA")).toBeInTheDocument();
});

it("D124: MyShields exibe estado de erro e permite acionar retry", () => {
  const retryMock = vi.fn();
  render(<MyShields status="error" onRetry={retryMock} />);
  expect(screen.getByText("Erro ao carregar seus Escudos")).toBeInTheDocument();
  expect(
    screen.getByText(/Por segurança clínica, nenhuma pontuação fictícia é exibida/i),
  ).toBeInTheDocument();

  const retryBtn = screen.getByRole("button", { name: "Tentar novamente" });
  fireEvent.click(retryBtn);
  expect(retryMock).toHaveBeenCalledTimes(1);
});

it("D124: MyShields sem avaliações suficientes exibe estado de formação sem atribuir conquista", () => {
  const unpopulated = {
    ...overview,
    state: {
      ...state,
      isProvisional: true,
      scoreAverage: null,
      scoreAverageRounded: null,
      evaluableDaysCount: 0,
    },
    history: [],
  };
  render(<MyShields overview={unpopulated} clinicId={clinicId} patientId={patientId} />);
  expect(screen.getByText("Sem avaliações suficientes na janela")).toBeInTheDocument();
  expect(screen.getByText("Aguardando avaliações")).toBeInTheDocument();
  expect(
    screen.getByText(/Você ainda não possui dias avaliáveis suficientes/i),
  ).toBeInTheDocument();
  expect(screen.queryByText("Escudo ativo: Origem")).not.toBeInTheDocument();
});
