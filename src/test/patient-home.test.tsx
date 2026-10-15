import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemoProvider } from "@/features/demo/context";
import { PatientHome } from "@/components/platform/patient-home";
import { PatientBottomNav } from "@/components/platform/patient-bottom-nav";
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

describe("Aplicativo do Paciente — Novo Visual Resumido", { timeout: 20000 }, () => {
  it("abre acesso aos Escudos no menu sem confundir com score demo", () => {
    renderWithDemo(<PatientHome />);
    expect(screen.queryByRole("link", { name: "Meus Escudos" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mais recursos de cuidado" }));
    expect(screen.getByRole("link", { name: "Meus Escudos" })).toHaveAttribute(
      "href",
      "/app/escudos",
    );
    expect(screen.getByLabelText(/Meu score demonstrativo/)).toBeInTheDocument();
    expect(screen.getByText("Meu cuidado")).toBeInTheDocument();
    expect(screen.queryByText("Gestão da clínica")).not.toBeInTheDocument();
  });
  it.each(["Enter", " "])("abre score pelo teclado com %s", (key) => {
    renderWithDemo(<PatientHome />);
    fireEvent.keyDown(screen.getByLabelText(/Meu score demonstrativo/), { key });
    expect(screen.getByText(/Score demonstrativo · 785 pontos/)).toBeInTheDocument();
  });
  it("tecla no botão de água não aciona navegação do cartão pai", () => {
    navigateMock.mockClear();
    renderWithDemo(<PatientHome />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Registrar consumo de água" }), {
      key: "Enter",
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
  it("renderiza cabeçalho, saudação 'Olá, Alex' e esconde seletores administrativos", () => {
    renderWithDemo(<PatientHome />);

    expect(screen.getByText("Olá, Alex")).toBeInTheDocument();
    expect(screen.queryByText("Super administrador")).not.toBeInTheDocument();
    expect(screen.queryByText("Ambiente de demonstração")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/Central de avisos/i).length).toBeGreaterThanOrEqual(1);
  });

  it("exibe faixa compacta de avisos e permite abrir central com detalhes", () => {
    renderWithDemo(<PatientHome />);

    const avisosBanner = screen.getByLabelText("Abrir central de avisos");
    expect(avisosBanner).toBeInTheDocument();
    expect(screen.getByText(/2 novos/i)).toBeInTheDocument();

    fireEvent.click(avisosBanner);
    expect(screen.getByText("Central de Avisos")).toBeInTheDocument();
    expect(screen.getByText("Exame de sangue disponível")).toBeInTheDocument();
  });

  it("exibe o card Meu protocolo com etapa e progresso sem poluição visual", () => {
    renderWithDemo(<PatientHome />);

    expect(screen.getByText("Meu protocolo")).toBeInTheDocument();
    expect(screen.getByText("Longevidade Ativa & Performance Metabólica")).toBeInTheDocument();
    expect(screen.getByText(/Etapa 2 de 5/i)).toBeInTheDocument();
  });

  it("renderiza cards Meu plano e Meu score lado a lado com pontuação destacada", () => {
    renderWithDemo(<PatientHome />);

    expect(screen.getByText("Meu plano")).toBeInTheDocument();
    expect(screen.getByText("Vitalícia Individual")).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();

    expect(screen.getByText("Meu score")).toBeInTheDocument();
    expect(screen.getByText("785")).toBeInTheDocument();
    expect(screen.getByText("pontos")).toBeInTheDocument();

    // Clicar em Meu score abre os critérios e evolução
    const scoreCard = screen.getByLabelText(/Meu score demonstrativo: 785 pontos fictícios/i);
    fireEvent.click(scoreCard);
    expect(screen.getByText(/Score demonstrativo · 785 pontos/i)).toBeInTheDocument();
    expect(screen.getByText("Hidratação diária")).toBeInTheDocument();
  });

  it("permite registrar humor e sono de forma independente com 5 alternativas", () => {
    renderWithDemo(<PatientHome />);

    // Humor
    const humorCard = screen.getByLabelText(/Como está/i);
    fireEvent.click(humorCard);
    expect(screen.getByText("Como você está se sentindo hoje?")).toBeInTheDocument();
    expect(screen.getByText("Excelente")).toBeInTheDocument();

    // Sono
    const sonoCard = screen.getByLabelText(/Seu sono/i);
    fireEvent.click(sonoCard);
    expect(screen.getByText("Como foi a qualidade do seu sono?")).toBeInTheDocument();
    expect(screen.getByText("Revigorante")).toBeInTheDocument();
  });

  it("card Água de hoje exibe consumo e botão '+ Água' abre adição de volume", () => {
    renderWithDemo(<PatientHome />);

    expect(screen.getByText("Água de hoje")).toBeInTheDocument();
    expect(screen.getByText(/1\.450 ml/i)).toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: "Registrar consumo de água" });
    fireEvent.click(addBtn);

    expect(screen.getByText("Registrar consumo de água")).toBeInTheDocument();
    expect(screen.getByText(/\+250 ml/i)).toBeInTheDocument();
  });

  it("apresenta os 12 atalhos grandes na ordem exata requerida", () => {
    renderWithDemo(<PatientHome />);

    const expectedShortcuts = [
      "Financeiro",
      "Água",
      "Clube de benefícios",
      "Balança",
      "Pulseira inteligente",
      "Protocolo",
      "Sono",
      "Score",
      "Exames",
      "Adesão",
      "Medicamentos",
      "Treinos",
    ];

    const shortcuts = screen
      .getAllByRole("button")
      .filter((btn) => btn.className.includes("patient-square-shortcut"));

    expect(shortcuts.length).toBe(12);

    expectedShortcuts.forEach((label, idx) => {
      expect(shortcuts[idx]).toHaveTextContent(label);
    });
  });

  it("rodapé fixo contém os seis destinos rigorosamente preservados e Água direciona ao módulo completo", () => {
    renderWithDemo(<PatientBottomNav />);

    expect(screen.getByText("INÍCIO")).toBeInTheDocument();
    expect(screen.getByText("TELEMEDICINA")).toBeInTheDocument();
    expect(screen.getByText("ÁGUA")).toBeInTheDocument();
    expect(screen.getByText("IA")).toBeInTheDocument();
    expect(screen.getByText("ALIMENTAÇÃO")).toBeInTheDocument();
    expect(screen.getByText("PERFIL")).toBeInTheDocument();

    const aguaLink = screen.getByText("ÁGUA").closest("a");
    expect(aguaLink).toBeInTheDocument();
    expect(aguaLink?.getAttribute("href")).toContain("hidratacao");
  });

  it("bloqueio financeiro restringe acessos clínicos quando inadimplente sem expor botão de alteração", () => {
    // 1. No estado regular, o alerta não é exibido e nenhum botão de simulação existe
    const { unmount } = renderWithDemo(<PatientHome />);
    expect(screen.queryByText(/Pendência financeira identificada/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Simular status financeiro")).not.toBeInTheDocument();
    unmount();

    // 2. Quando o bloqueio financeiro está ativo, restringe os acessos clínicos
    renderWithDemo(<PatientHome isBlockedFinancial={true} />);
    expect(screen.getByText(/Pendência financeira identificada/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Simular status financeiro")).not.toBeInTheDocument();
  });

  it("atalho da Pulseira inteligente oferece legenda completa e compacta para telas estreitas", () => {
    renderWithDemo(<PatientHome />);
    const pulseiraBtn = screen.getByLabelText(/Abrir Pulseira inteligente/i);
    expect(pulseiraBtn).toBeInTheDocument();
    expect(pulseiraBtn.querySelector(".label-full")).toHaveTextContent("Pulseira inteligente");
    expect(pulseiraBtn.querySelector(".label-short")).toHaveTextContent("Pulseira");
  });
});
