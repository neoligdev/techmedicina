import { describe, it, expect } from "vitest";
import { clinics, filterClinics } from "@/features/demo/data";
import { navigation } from "@/features/demo/navigation";
import { moduleSpec } from "@/features/demo/module-catalog";

describe("Dados administrativos demonstrativos", () => {
  it("contém somente duas clínicas com identificadores únicos", () => {
    expect(clinics).toHaveLength(2);
    expect(new Set(clinics.map((clinic) => clinic.id)).size).toBe(2);
  });

  it("busca por nome sem diferenciar acentos e caixa", () => {
    expect(filterClinics("  viva saude  ")).toHaveLength(1);
    expect(filterClinics("HORIZONTE")[0]?.id).toBe("clinica-horizonte");
    expect(filterClinics("inexistente")).toHaveLength(0);
    expect(filterClinics("")).toHaveLength(2);
  });

  it("oferece os menus previstos para as quatro áreas com a inclusão explícita do simulador", () => {
    // Assert explícito para +1 simulador
    const simuladorNav = navigation["super-admin"].find((i) => i.slug === "simulador");
    expect(simuladorNav).toBeDefined();
    expect(simuladorNav?.label).toBe("Simulador");

    for (const area of ["super-admin", "clinica", "medico", "app"] as const) {
      expect(navigation[area].some((item) => item.slug === "")).toBe(true);
      for (const item of navigation[area]) {
        if (item.slug && item.slug !== "personalizacao" && item.slug !== "simulador")
          expect(moduleSpec(area, item.slug), `${area}/${item.slug}`).toBeDefined();
      }
      expect(new Set(navigation[area].map((item) => item.slug)).size).toBe(navigation[area].length);
    }
  });
});
