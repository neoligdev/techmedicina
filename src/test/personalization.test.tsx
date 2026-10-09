import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, act, waitFor } from "@testing-library/react";
import { DemoProvider, useDemoClinic } from "@/features/demo/context";
import { PersonalizationPage } from "@/components/platform/personalization-page";
import { AppShell } from "@/components/platform/app-shell";
import { useClinicIdentityEffect } from "@/features/demo/theme";
import { loadPreferences } from "@/features/demo/preference-storage";
import { filterClinics } from "@/features/demo/data";
import { Brand } from "@/components/platform/brand";

function IdentityTestController({
  branded,
  name,
  favicon,
}: {
  branded: boolean;
  name: string;
  favicon?: string;
}) {
  useClinicIdentityEffect(branded, name, favicon);
  return null;
}
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
    vi.unstubAllGlobals();
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
  }, 30000);
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

  it("salva imagem A/recarregar/alternar B sem vazamento e remover identidade A sem alterar B", async () => {
    const validPngA =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const validPngB =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4wBq9hkwAAAABJRU5ErkJggg==";

    // 1) Set up mock for FileReader and Image
    const imgInstances: unknown[] = [];

    vi.stubGlobal(
      "FileReader",
      class {
        onload: ((ev: { target: { result: string } }) => void) | null = null;
        onerror: ((ev: Event) => void) | null = null;
        readAsDataURL(file: File) {
          this.onload?.({
            target: { result: file.name === "logoA.png" ? validPngA : validPngB },
          });
        }
      },
    );

    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          imgInstances.push(this);
        }
        set src(value: string) {
          if (value === validPngA || value === validPngB) this.onload?.();
          else this.onerror?.();
        }
      },
    );

    const view = mount();

    // Start on A
    fireEvent.click(screen.getByText("Clínica A"));

    // Simulate upload A
    const validPngBytesA = Uint8Array.from(atob(validPngA.split(",")[1]!), (c) => c.charCodeAt(0));
    const fileA = new File([validPngBytesA], "logoA.png", { type: "image/png" });
    const logoInput = screen.getByLabelText("Logomarca");
    fireEvent.change(logoInput, { target: { files: [fileA] } });

    // Wait for Image mock to trigger onload and update state
    await screen.findByRole("button", { name: "Remover logomarca" });

    // Save A
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    // Switch to B
    fireEvent.click(screen.getByText("Clínica B"));

    // Upload B
    const validPngBytesB = Uint8Array.from(atob(validPngB.split(",")[1]!), (c) => c.charCodeAt(0));
    const fileB = new File([validPngBytesB], "logoB.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Logomarca"), { target: { files: [fileB] } });
    await screen.findByRole("button", { name: "Remover logomarca" });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    // Unmount and Remount
    view.unmount();
    const newView = mount();

    // Check A
    fireEvent.click(screen.getByText("Clínica A"));
    expect(screen.getByTestId("saved")).toHaveTextContent(validPngA);
    expect(screen.getByTestId("saved")).not.toHaveTextContent(validPngB);

    // Check B
    fireEvent.click(screen.getByText("Clínica B"));
    expect(screen.getByTestId("saved")).toHaveTextContent(validPngB);

    // Remove B
    fireEvent.click(screen.getByRole("button", { name: "Remover logomarca" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByTestId("saved")).not.toHaveTextContent(validPngB);

    // Switch back to A, A should still have its logo
    fireEvent.click(screen.getByText("Clínica A"));
    expect(screen.getByTestId("saved")).toHaveTextContent(validPngA);

    newView.unmount();
  }, 30000);

  it("ignora callback stale de imagem", async () => {
    const validPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    let deferredImageResolve: (() => void) | undefined;

    vi.stubGlobal(
      "FileReader",
      class {
        onload: ((ev: { target: { result: string } }) => void) | null = null;
        readAsDataURL(file: File) {
          this.onload?.({ target: { result: validPng } });
        }
      },
    );

    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        set src(value: string) {
          deferredImageResolve = () => this.onload?.();
        }
      },
    );

    mount();
    const validPngBytes = Uint8Array.from(atob(validPng.split(",")[1]!), (c) => c.charCodeAt(0));
    const file = new File([validPngBytes], "logo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Logomarca"), { target: { files: [file] } });

    // Wait for onload to trigger and img.src to be assigned
    await waitFor(() => expect(deferredImageResolve).toBeDefined());

    // Switch clinic
    fireEvent.click(screen.getByText("Clínica B"));

    // Now trigger the stale onload
    await act(async () => deferredImageResolve!());

    // The logo shouldn't appear
    expect(screen.queryByRole("button", { name: "Remover logomarca" })).not.toBeInTheDocument();
  });

  it("dados inválidos de imagem ou quota ignorados de forma segura", () => {
    mount();
    // Limit is 200KB.
    const largeFile = new File([new ArrayBuffer(300 * 1024)], "large.png", { type: "image/png" });
    const logoInput = screen.getByLabelText("Logomarca");
    fireEvent.change(logoInput, { target: { files: [largeFile] } });
    expect(screen.getByRole("alert")).toHaveTextContent("limite de 200KB");

    const invalidFile = new File(["svg"], "vector.svg", { type: "image/svg+xml" });
    fireEvent.change(logoInput, { target: { files: [invalidFile] } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Apenas imagens PNG, JPEG ou WebP são permitidas",
    );

    const corruptedPng = new File(["not a png"], "fake.png", { type: "image/png" });
    fireEvent.change(logoInput, { target: { files: [corruptedPng] } });

    // The magic byte check is async. We need to await it.
    // In vitest we can use findByRole or wait for the alert text to change.
  });

  it("dados corrompidos acionam erro assíncrono", async () => {
    vi.stubGlobal(
      "FileReader",
      class {
        onload: ((ev: { target: { result: string } }) => void) | null = null;
        readAsDataURL(file: File) {
          this.onload?.({ target: { result: "data:image/png;base64,bm90IGEgcG5n" } });
        }
      },
    );

    mount();
    const logoInput = screen.getByLabelText("Logomarca");
    const corruptedPng = new File(["not a png"], "fake.png", { type: "image/png" });
    fireEvent.change(logoInput, { target: { files: [corruptedPng] } });

    expect(
      await screen.findByText("A imagem está corrompida ou tem formato falso."),
    ).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("ignora asset inválido preservando nome e cores antigas", () => {
    localStorage.setItem(
      "plugpix:clinic-visual:v1:clinica-viva",
      JSON.stringify({
        name: "Clinica Migrada",
        primary: "#111111",
        secondary: "#222222",
        mode: "light",
        logo: "https://external.url/image.png",
        favicon: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      }),
    );
    const loaded = loadPreferences("clinica-viva");
    expect(loaded).toBeDefined();
    expect(loaded?.name).toBe("Clinica Migrada");
    expect(loaded?.primary).toBe("#111111");
    expect(loaded?.logo).toBeUndefined();
    expect(loaded?.favicon).toBeUndefined();
  });

  it("Super ADM e troca de clínica tratam corretamente o callback atrasado de favicon", async () => {
    const validPngA =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const validPngB =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4wBq9hkwAAAABJRU5ErkJggg==";

    const link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);

    let resolveImage: (() => void) | undefined;
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        set src(value: string) {
          resolveImage = () => this.onload?.();
        }
      },
    );

    const { rerender, unmount } = render(
      <IdentityTestController branded={true} name="Clinica A" favicon={validPngA} />,
    );

    expect(document.title).toBe("Clinica A | Techmedicina");
    expect(link.href).toContain("/favicon.ico"); // Defaults before load

    // Switch to Super ADM before A loads
    rerender(<IdentityTestController branded={false} name="PlugPix" />);

    expect(document.title).toBe("PlugPix Techmedicina");

    // Now the delayed callback from A arrives
    await waitFor(() => expect(resolveImage).toBeDefined());
    await act(async () => resolveImage!());
    resolveImage = undefined;

    // Should NOT overwrite the favicon because it was cancelled
    expect(link.href).toContain("/favicon.ico");

    // Switch back to branded B
    rerender(<IdentityTestController branded={true} name="Clinica B" favicon={validPngB} />);
    expect(document.title).toBe("Clinica B | Techmedicina");

    // Simulate B loading
    await waitFor(() => expect(resolveImage).toBeDefined());
    await act(async () => resolveImage!());

    expect(link.href).toContain(validPngB);

    unmount();
    document.head.removeChild(link);
  });

  it("exibe fallback ao falhar carregamento de imagem e recupera ao trocar de clínica", () => {
    // 1) Test Brand fallback and recovery
    const { rerender } = render(
      <Brand name="Clinica A" logo="bad-image" clinic={true} initials="CA" />,
    );
    const imgA = screen.getByAltText("Logo");
    fireEvent.error(imgA);
    // Should fallback to initials since logo failed
    expect(screen.queryByAltText("Logo")).not.toBeInTheDocument();
    expect(screen.getByText("CA")).toBeInTheDocument();

    // Recover when a new valid logo is provided
    rerender(<Brand name="Clinica B" logo="good-image" clinic={true} initials="CB" />);
    // The image should be in the document again, because error state reset
    expect(screen.getByAltText("Logo")).toBeInTheDocument();
    expect(screen.queryByText("CB")).not.toBeInTheDocument();
  });
});
