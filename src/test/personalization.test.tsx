import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoProvider, useDemoClinic } from "@/features/demo/context";
import { PersonalizationPage } from "@/components/platform/personalization-page";
import { loadPreferences } from "@/features/demo/preference-storage";
import { filterClinics } from "@/features/demo/data";

function Harness() {
  const { clinics, selectClinic, preferences } = useDemoClinic();
  return (
    <>
      <button onClick={() => selectClinic(clinics[0]!.id)}>Clínica A</button>
      <button onClick={() => selectClinic(clinics[1]!.id)}>Clínica B</button>
      <output data-testid="saved">{JSON.stringify(preferences)}</output>
      <PersonalizationPage />
    </>
  );
}
const mount = () =>
  render(
    <DemoProvider>
      <Harness />
    </DemoProvider>,
  );
describe("Personalização por clínica", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  it("salva, alterna sem misturar preferências e recupera após remontar", () => {
    const view = mount();
    const original = screen
      .getByLabelText("Nome de exibição", { selector: "#clinic-display-name" })
      .getAttribute("value");
    fireEvent.change(
      screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      { target: { value: "Unidade A personalizada" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Escuro" }));
    fireEvent.change(screen.getByLabelText("Cor principal", { selector: "input" }), {
      target: { value: "#663399" },
    });
    fireEvent.change(screen.getByLabelText("Cor secundária", { selector: "input" }), {
      target: { value: "#336699" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByTestId("saved")).toHaveTextContent('"mode":"dark"');
    fireEvent.click(screen.getByText("Clínica B"));
    expect(screen.getByTestId("saved")).not.toHaveTextContent("Unidade A personalizada");
    fireEvent.change(
      screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      { target: { value: "Unidade B personalizada" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    view.unmount();
    mount();
    expect(screen.getByTestId("saved")).toHaveTextContent("Unidade A personalizada");
    expect(screen.getByTestId("saved")).toHaveTextContent('"primary":"#663399"');
    expect(screen.getByTestId("saved")).toHaveTextContent('"secondary":"#336699"');
    fireEvent.click(screen.getByText("Clínica B"));
    expect(screen.getByTestId("saved")).toHaveTextContent("Unidade B personalizada");
    fireEvent.click(screen.getByText("Clínica A"));
    fireEvent.click(screen.getByRole("button", { name: "Restaurar padrão" }));
    expect(
      screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
    ).toHaveValue(original);
    expect(screen.getByTestId("saved")).not.toHaveTextContent("#663399");
    expect(screen.getByTestId("saved")).not.toHaveTextContent("#336699");
    fireEvent.click(screen.getByText("Clínica B"));
    expect(screen.getByTestId("saved")).toHaveTextContent("Unidade B personalizada");
  }, 15000);
  it("não confirma nem aplica uma gravação recusada", () => {
    mount();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    fireEvent.change(
      screen.getByLabelText("Nome de exibição", { selector: "#clinic-display-name" }),
      { target: { value: "Não gravado" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível salvar");
    expect(screen.getByTestId("saved")).not.toHaveTextContent("Não gravado");
  });
  it("ignora armazenamento inválido", () => {
    localStorage.setItem("plugpix:clinic-visual:v1:clinica-horizonte", "{quebrado");
    expect(loadPreferences("clinica-horizonte")).toBeUndefined();
  });
  it("aplica busca personalizada em clínicas com nomes alterados", () => {
    const customClinics = [
      {
        id: "clinica-viva",
        name: "Hospital São Lucas",
        initials: "SL",
        status: "Ativa" as const,
        enabledLives: 10,
        theme: "verde" as const,
      },
      {
        id: "clinica-horizonte",
        name: "Clínica Horizonte",
        initials: "CH",
        status: "Ativa" as const,
        enabledLives: 10,
        theme: "azul" as const,
      },
    ];
    const results = filterClinics("Lucas", customClinics);
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("clinica-viva");
  });
});
