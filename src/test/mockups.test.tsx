import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ModuleWorkspace } from "@/components/platform/module-page";
import { moduleSpec } from "@/features/demo/module-catalog";
const spec = moduleSpec("super-admin", "planos")!;
afterEach(cleanup);
describe("Prévia interativa dos módulos", () => {
  it("filtra busca e situação e restaura resultados", () => {
    render(<ModuleWorkspace spec={spec} />);
    fireEvent.change(screen.getByLabelText(`Buscar em ${spec.title}`), {
      target: { value: "TELEMEDICINA" },
    });
    expect(screen.queryByText("Catálogo de dispositivos")).toBeNull();
    expect(screen.getByText("Catálogo de telemedicina")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Situação"), { target: { value: "Rascunho" } });
    expect(screen.getByText("Nenhum exemplo encontrado")).toBeDefined();
    fireEvent.click(screen.getByText("Limpar filtros"));
    expect(screen.getByText("Catálogo de dispositivos")).toBeDefined();
  });
  it("cancela e limpa o formulário sem criar item", () => {
    render(<ModuleWorkspace spec={spec} />);
    fireEvent.click(screen.getByText(spec.action!));
    fireEvent.change(screen.getByLabelText(spec.fields[0]), { target: { value: "Descartado" } });
    fireEvent.click(screen.getByText("Cancelar"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Descartado")).toBeNull();
    fireEvent.click(screen.getByText(spec.action!));
    expect((screen.getByLabelText(spec.fields[0]) as HTMLInputElement).value).toBe("");
  });
  it("valida nome e mantém descrição no detalhe do rascunho", () => {
    render(<ModuleWorkspace spec={spec} />);
    fireEvent.click(screen.getByText(spec.action!));
    fireEvent.change(screen.getByLabelText(spec.fields[0]), { target: { value: "  " } });
    fireEvent.click(screen.getByText("Adicionar exemplo"));
    expect(screen.getByRole("alert").textContent).toContain("3 caracteres");
    fireEvent.change(screen.getByLabelText(spec.fields[0]), {
      target: { value: "  Plano fictício  " },
    });
    fireEvent.change(screen.getByLabelText(spec.fields[1]), {
      target: { value: "Descrição experimental" },
    });
    fireEvent.click(screen.getByText("Adicionar exemplo"));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByLabelText("Ver detalhes de Plano fictício"));
    expect(within(screen.getByRole("dialog")).getByText("Descrição experimental")).toBeDefined();
  });
  it("descarta rascunhos ao desmontar a tela", () => {
    const view = render(<ModuleWorkspace spec={spec} />);
    fireEvent.click(screen.getByText(spec.action!));
    fireEvent.change(screen.getByLabelText(spec.fields[0]), {
      target: { value: "Rascunho isolado" },
    });
    fireEvent.click(screen.getByText("Adicionar exemplo"));
    view.unmount();
    render(<ModuleWorkspace spec={spec} />);
    expect(screen.queryByText("Rascunho isolado")).toBeNull();
  });
});
