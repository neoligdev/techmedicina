import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoProvider } from "@/features/demo/context";
import { AppShieldsSection } from "@/features/journey/app-shields-section";
import { MyShields } from "@/features/journey/my-shields";
import { ALEX_DEMO_OVERVIEW } from "@/features/journey/demo-data";
import { SHIELD_TIERS } from "@/features/journey/contracts";
import { shouldEnablePatientDemo } from "@/features/demo/demo-authorization";

afterEach(cleanup);

function renderWithDemo(ui: React.ReactNode) {
  return render(<DemoProvider>{ui}</DemoProvider>);
}

describe("D123: Seção Meus Escudos e Histórico da Jornada (/app/escudos)", () => {
  it("renderiza AppShieldsSection com contexto de clínica e modo demonstrativo autorizado", async () => {
    renderWithDemo(<AppShieldsSection />);

    // Título e subtítulo da página oficial
    expect(screen.getByRole("heading", { name: "Meus Escudos" })).toBeInTheDocument();
    expect(screen.getByText("JORNADA · Acompanhamento")).toBeInTheDocument();

    // Em ambiente de teste / demo, carrega a experiência demonstrativa de Alex
    await waitFor(() => {
      expect(screen.getByText("Escudo ativo: Ritmo")).toBeInTheDocument();
    });

    expect(screen.getByText(/JORNADA:\s*42\s*pontos/i)).toBeInTheDocument();
    expect(screen.getByText("Perfil demonstrativo")).toBeInTheDocument();

    // Galeria com os 5 níveis
    expect(screen.getByRole("heading", { name: "Galeria de Escudos" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Origem" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "Avanço" })).toBeInTheDocument();
  });

  it("permite consultar e fechar detalhes de qualquer escudo na galeria interativa", async () => {
    renderWithDemo(<AppShieldsSection />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Galeria de Escudos" })).toBeInTheDocument();
    });

    // Clicar no escudo Plenitude (nível 5)
    const plenitudeCard = screen.getByRole("button", { name: /Ver detalhes do escudo Plenitude/i });
    fireEvent.click(plenitudeCard);

    // Modal de Plenitude
    expect(screen.getByRole("heading", { name: "Escudo Plenitude" })).toBeInTheDocument();
    expect(screen.getByText(/Nível 5 da JORNADA/i)).toBeInTheDocument();
    expect(screen.getByText(/Faixa de 90 a 100 pontos/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Excelência e integração completa dos pilares de saúde e vitalidade/i),
    ).toBeInTheDocument();

    // Fechar modal
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("heading", { name: "Escudo Plenitude" })).not.toBeInTheDocument();
  });

  it("garante exibição do histórico imutável com fuso horário America/Bahia e motivo do marco", async () => {
    renderWithDemo(<AppShieldsSection />);

    await waitFor(() => {
      expect(screen.getByText("Histórico de conquistas")).toBeInTheDocument();
    });

    // Eventos do Alex formatados
    expect(screen.getByText("Promoção")).toBeInTheDocument();
    expect(screen.getByText("Conquista Inicial")).toBeInTheDocument();
    expect(screen.getAllByText(/America\/Bahia/).length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText(/Promoção para Ritmo com média consolidada de 42 pontos/i),
    ).toBeInTheDocument();
  });

  it("modo demonstrativo não pode ser ativado quando há sessão real de usuário", () => {
    // Com hasSession = true (usuário logado), never demo
    expect(shouldEnablePatientDemo(true)).toBe(false);

    // Com hasSession = null (carregando), adota postura restritiva
    expect(shouldEnablePatientDemo(null)).toBe(false);
  });

  it("usuário real sem dados autorizados de backend recebe estado informativo e seguro", () => {
    const realClinicId = "44444444-4444-4444-8444-444444444444";
    const realPatientId = "55555555-5555-4555-8555-555555555555";

    // Sem overview autorizado fornecido
    renderWithDemo(<MyShields isDemo={false} clinicId={realClinicId} patientId={realPatientId} />);

    // Estado seguro informativo
    expect(screen.getByText("Seu histórico estará aqui")).toBeInTheDocument();
    expect(screen.getByText(/Nenhum histórico autorizado foi carregado/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Não há pontuação ou conquista atribuída nesta tela/i),
    ).toBeInTheDocument();

    // Não renderiza dados inventados do Alex
    expect(screen.queryByText("Escudo ativo: Ritmo")).not.toBeInTheDocument();
    expect(screen.queryByText("42 pontos")).not.toBeInTheDocument();
    expect(screen.queryByText("Perfil demonstrativo")).not.toBeInTheDocument();

    // Apresenta a galeria informativa para conhecimento dos 5 níveis
    expect(screen.getByText("Conheça os 5 Escudos da JORNADA")).toBeInTheDocument();
  });
});
