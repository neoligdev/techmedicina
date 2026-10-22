import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemoProvider } from "@/features/demo/context";
import { PatientHome } from "@/components/platform/patient-home";

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => {
    let href = to;
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        href = href.replace(`$${key}`, val);
      }
    }
    return <a href={href}>{children}</a>;
  },
  useNavigate: () => navigateMock,
  useRouterState: () => "/app",
}));

function renderWithDemo(ui: React.ReactNode) {
  return render(<DemoProvider>{ui}</DemoProvider>);
}

describe("Aplicativo do Cliente — VITALIDADE, JORNADA, ESCUDOS e Hábitos", () => {
  it("renderiza o card de VITALIDADE com os 5 pilares do PRD e sem pontuação numérica inventada", () => {
    renderWithDemo(<PatientHome />);

    // Título e status ético
    expect(screen.getByRole("heading", { name: "VITALIDADE" })).toBeInTheDocument();
    expect(screen.getByText("Em homologação clínica")).toBeInTheDocument();
    expect(
      screen.getByText(/Sem pontuação numérica fictícia até homologação metodológica/i),
    ).toBeInTheDocument();

    // 5 Pilares oficiais do PRD §11.3
    expect(screen.getByText("Cardiometabólico")).toBeInTheDocument();
    expect(screen.getAllByText("Atividade física").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Sono & descanso")).toBeInTheDocument();
    expect(screen.getByText("Hábitos de vida")).toBeInTheDocument();
    expect(screen.getByText("Bem-estar emocional")).toBeInTheDocument();

    // Modal de metodologia
    const btnMetodologia = screen.getByRole("button", {
      name: /Entender metodologia de Vitalidade/i,
    });
    fireEvent.click(btnMetodologia);

    expect(screen.getByRole("heading", { name: "Metodologia VITALIDADE" })).toBeInTheDocument();
    expect(screen.getByText(/Compromisso Ético e Regulatório/i)).toBeInTheDocument();
    expect(
      screen.getByText(/A VITALIDADE não possui pontuação numérica fictícia/i),
    ).toBeInTheDocument();

    // Fechar modal
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(
      screen.queryByRole("heading", { name: "Metodologia VITALIDADE" }),
    ).not.toBeInTheDocument();
  });

  it("renderiza a JORNADA com o escudo ativo, média da janela, progresso e regra de regressão", () => {
    navigateMock.mockClear();
    renderWithDemo(<PatientHome />);

    expect(screen.getByRole("heading", { name: "JORNADA & Meus Escudos" })).toBeInTheDocument();
    expect(screen.getByText("Escudo Ativo: Ritmo")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/7 dias avaliáveis na janela/i)).toBeInTheDocument();
    expect(screen.getByText(/Próximo escudo: Avanço/i)).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument(); // 13 pts faltantes (55 - 42)

    // Barra de progresso para o próximo escudo
    const progressBar = screen.getByRole("progressbar", {
      name: /Progresso para o escudo Avanço/i,
    });
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "48");

    // Regra de regressão do PRD §11.5
    expect(
      screen.getByText(
        /Uma transição descendente só ocorre após 3 avaliações diárias consecutivas/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Suas conquistas anteriores permanecem salvas/i)).toBeInTheDocument();

    // Navegação para a rota oficial de Meus Escudos
    const btnEscudos = screen.getByRole("button", { name: /Ver todos os escudos e histórico/i });
    fireEvent.click(btnEscudos);
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/app/$section",
      params: { section: "escudos" },
    });
  });

  it("permite registrar hábitos de alimentação com autorrelato explícito", () => {
    renderWithDemo(<PatientHome />);

    // Localizar item de alimentação
    const alimentacaoBtn = screen.getByLabelText(/Registrar alimentação consciente do dia/i);
    expect(alimentacaoBtn).toBeInTheDocument();
    fireEvent.click(alimentacaoBtn);

    // Modal de alimentação
    expect(
      screen.getByRole("heading", { name: "Registro de Alimentação Consciente" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Autorrelato direto do cliente/i)).toBeInTheDocument();

    // Selecionar Jantar e Leve
    fireEvent.click(screen.getByRole("button", { name: "Jantar" }));
    fireEvent.click(screen.getByRole("button", { name: "Leve" }));

    const confirmBtn = screen.getByRole("button", { name: "Confirmar registro de refeição" });
    fireEvent.click(confirmBtn);

    expect(screen.getByText(/Refeição registrada com sucesso/i)).toBeInTheDocument();
  });

  it("permite registrar atividade física indicando modalidade, duração e intensidade", () => {
    renderWithDemo(<PatientHome />);

    const atividadeBtn = screen.getByLabelText(/Registrar atividade física do dia/i);
    fireEvent.click(atividadeBtn);

    expect(
      screen.getByRole("heading", { name: "Registro de Atividade Física" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Autorrelato manual/i)).toBeInTheDocument();

    // Selecionar Musculação e 45 min
    fireEvent.click(screen.getByRole("button", { name: "Musculação" }));
    fireEvent.click(screen.getByRole("button", { name: "45 min" }));

    const confirmBtn = screen.getByRole("button", { name: "Confirmar registro de treino" });
    fireEvent.click(confirmBtn);

    expect(screen.getByText(/Atividade registrada com sucesso/i)).toBeInTheDocument();
  });

  it("permite confirmar adesão aos medicamentos prescritos da rotina", () => {
    renderWithDemo(<PatientHome />);

    const medBtn = screen.getByLabelText(/Confirmar tomada de medicamentos prescritos/i);
    fireEvent.click(medBtn);

    expect(
      screen.getByRole("heading", { name: "Adesão aos Medicamentos do Dia" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Complexo Vitamínico & Minerais")).toBeInTheDocument();
    expect(screen.getByText("Magnésio Inositol")).toBeInTheDocument();
    expect(
      screen.getByText(/A adesão medicamentosa compõe 20% do peso na JORNADA/i),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Confirmar todas as doses de hoje" });
    fireEvent.click(confirmBtn);

    expect(screen.getByText(/Tomada confirmada com sucesso/i)).toBeInTheDocument();
  });

  it("exibe status honesto de dispositivos e garante equidade sem exigência de hardware", () => {
    renderWithDemo(<PatientHome />);

    // Equipamentos previstos
    expect(screen.getByText("Pulseira inteligente (H59 / H59MAX)")).toBeInTheDocument();
    expect(screen.getByText("Homologação BLE")).toBeInTheDocument();

    expect(screen.getByText("Balança de bioimpedância")).toBeInTheDocument();
    expect(screen.getByText("Não configurada")).toBeInTheDocument();

    expect(screen.getByText("Anel inteligente")).toBeInTheDocument();
    expect(screen.getByText("Suporte futuro")).toBeInTheDocument();

    // Garantia ética de não simular dados vitais falsos
    expect(screen.getByText(/Sem medições falsas ou sinais vitais simulados/i)).toBeInTheDocument();

    // Princípio de equidade para clientes sem dispositivos
    expect(
      screen.getByText(/Clientes sem dispositivos possuem elegibilidade idêntica na JORNADA/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /alcançar pontuação máxima \(100 pontos\) e o escudo Plenitude apenas com seus registros/i,
      ),
    ).toBeInTheDocument();
  });
});
