import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SimulatorPage } from "../index";

// Mock resize observer
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe("SimulatorPage RTL UI Tests", () => {
  it("deve renderizar a interface base", () => {
    render(<SimulatorPage />);
    expect(screen.getByText(/Simulador de Rentabilidade \(Didático\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Conservador/i)).toBeInTheDocument();
    expect(screen.getByText(/Comparativo/i)).toBeInTheDocument();
  });

  it("deve preencher inputs sem perder o foco usando fireEvent", () => {
    render(<SimulatorPage />);

    const inputTitulares = screen.getByLabelText(/Qtd. Titulares/i) as HTMLInputElement;

    // Focar e digitar sequencialmente
    inputTitulares.focus();
    fireEvent.change(inputTitulares, { target: { value: "1" } });
    fireEvent.change(inputTitulares, { target: { value: "12" } });
    fireEvent.change(inputTitulares, { target: { value: "123" } });

    expect(inputTitulares.value).toBe("123");
    expect(document.activeElement).toBe(inputTitulares);
  });

  it("deve exibir estado incompleto inicialmente", () => {
    render(<SimulatorPage />);
    expect(screen.getByText(/Estado Incompleto/i)).toBeInTheDocument();
  });

  it("deve calcular o cenário base com o preenchimento de exemplo", () => {
    render(<SimulatorPage />);

    const preencherBtn = screen.getByRole("button", { name: /Preencher Exemplo Fictício/i });
    fireEvent.click(preencherBtn);

    expect(screen.queryByText(/Estado Incompleto/i)).not.toBeInTheDocument();

    // Deve mostrar as vidas calculadas e as contribuições
    expect(screen.getByText("250")).toBeInTheDocument(); // 100+150 vidas

    // Validar se gerou string com valor exato BRL formatado, evitando as strings de fórmulas
    expect(screen.getAllByText("R$ 5.625,00").length).toBeGreaterThan(0);
  });

  it("deve resetar os inputs ao clicar em limpar cenário", () => {
    render(<SimulatorPage />);

    const preencherBtn = screen.getByRole("button", { name: /Preencher Exemplo Fictício/i });
    fireEvent.click(preencherBtn);

    expect(screen.queryByText(/Estado Incompleto/i)).not.toBeInTheDocument();

    const limparBtn = screen.getByRole("button", { name: /Limpar Cenário/i });
    fireEvent.click(limparBtn);

    expect(screen.getByText(/Estado Incompleto/i)).toBeInTheDocument();
  });

  it("deve alterar entre abas e renderizar comparativo corretamente", () => {
    render(<SimulatorPage />);

    const tabComparativo = screen.getByRole("tab", { name: /Comparativo/i });
    fireEvent.mouseDown(tabComparativo);

    expect(tabComparativo).toHaveAttribute("aria-selected", "true");

    expect(screen.getByText(/Comparação de Cenários/i)).toBeInTheDocument();

    const incompletos = screen.getAllByText(/Cenário incompleto ou com dados inválidos/i);
    expect(incompletos.length).toBe(3);
  });
});
