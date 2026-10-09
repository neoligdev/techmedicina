import { describe, it, expect } from "vitest";
import { calcularRentabilidade, SimulatorInputs } from "../calculator";

describe("Calculadora de Rentabilidade", () => {
  const baseValidInputs: SimulatorInputs = {
    titulares: 100,
    dependentes: 50,
    precoTitular: 50,
    precoDependente: 25,
    impostosTaxasComissoesPerc: 10,
    custoMedicos: 5,
    custoIA: 2,
    custoDispositivos: 10,
    custosFixosMensais: 1000,
    custoUnicoImplantacao: 15,
    custoUnicoDispositivo: 100,
  };

  it("deve calcular corretamente um cenário positivo mantendo proporção", () => {
    const res = calcularRentabilidade(baseValidInputs);
    expect(res.isCalculable).toBe(true);
    expect(res.erros).toHaveLength(0);
    expect(res.vidas).toBe(150);
    expect(res.receitaBruta).toBe(6250);
    expect(res.deducoes).toBe(625);
    expect(res.receitaLiquida).toBe(5625);
    expect(res.custosRecorrentesUnitarios).toBe(17);
    expect(res.custosRecorrentesTotais).toBe(3550);
    expect(res.contribuicaoMensal).toBe(2075);
    expect(res.equilibrioVidas).toBe(49);
    expect(res.custosUnicosUnitarios).toBe(115);
    expect(res.custosUnicosTotais).toBe(17250);
  });

  it("deve rejeitar campos vazios (null, NaN, Infinity)", () => {
    expect(calcularRentabilidade({ ...baseValidInputs, precoTitular: null }).isCalculable).toBe(
      false,
    );
    expect(calcularRentabilidade({ ...baseValidInputs, titulares: NaN }).isCalculable).toBe(false);
    expect(calcularRentabilidade({ ...baseValidInputs, custoMedicos: Infinity }).isCalculable).toBe(
      false,
    );
  });

  it("deve aceitar zero explícito para todos os valores monetários", () => {
    const zeroInput = {
      ...baseValidInputs,
      custosFixosMensais: 0,
      precoDependente: 0,
      dependentes: 0,
      custoUnicoImplantacao: 0,
      custoIA: 0,
    };
    const res = calcularRentabilidade(zeroInput);
    expect(res.isCalculable).toBe(true);
    expect(res.vidas).toBe(100);
  });

  it("deve validar negatividade em cada entrada", () => {
    const fields = Object.keys(baseValidInputs) as (keyof SimulatorInputs)[];
    fields.forEach((k) => {
      const negInput = { ...baseValidInputs, [k]: -10 };
      const res = calcularRentabilidade(negInput);
      expect(res.isCalculable).toBe(false);
      expect(res.erros.some((e) => e.includes("negativos"))).toBe(true);
    });
  });

  it("deve validar lives com isSafeInteger e rejeitar soma insegura", () => {
    expect(calcularRentabilidade({ ...baseValidInputs, titulares: 1.5 }).isCalculable).toBe(false);
    expect(
      calcularRentabilidade({ ...baseValidInputs, titulares: Number.MAX_SAFE_INTEGER + 1 })
        .isCalculable,
    ).toBe(false);
    expect(calcularRentabilidade({ ...baseValidInputs, dependentes: 2.1 }).isCalculable).toBe(
      false,
    );
    expect(
      calcularRentabilidade({
        titulares: Number.MAX_SAFE_INTEGER,
        dependentes: 1,
        precoTitular: 1,
        precoDependente: 1,
        impostosTaxasComissoesPerc: 0,
        custoMedicos: 0,
        custoIA: 0,
        custoDispositivos: 0,
        custosFixosMensais: 0,
        custoUnicoImplantacao: 0,
        custoUnicoDispositivo: 0,
      }).isCalculable,
    ).toBe(false);
  });

  it("deve rejeitar overflow extremo (receita gerada infinita)", () => {
    const res = calcularRentabilidade({
      titulares: 2,
      dependentes: 0,
      precoTitular: Number.MAX_VALUE,
      precoDependente: 0,
      impostosTaxasComissoesPerc: 0,
      custoMedicos: 0,
      custoIA: 0,
      custoDispositivos: 0,
      custosFixosMensais: 0,
      custoUnicoImplantacao: 0,
      custoUnicoDispositivo: 0,
    });
    expect(res.isCalculable).toBe(false);
    expect(res.erros.some((e) => e.includes("Overflow"))).toBe(true);
  });

  it("deve rejeitar overflow de ponto de equilibrio vidas", () => {
    const extrem = calcularRentabilidade({
      titulares: 1,
      dependentes: 0,
      precoTitular: Number.MIN_VALUE,
      precoDependente: 0,
      impostosTaxasComissoesPerc: 0,
      custoMedicos: 0,
      custoIA: 0,
      custoDispositivos: 0,
      custosFixosMensais: Number.MAX_VALUE,
      custoUnicoImplantacao: 0,
      custoUnicoDispositivo: 0,
    });
    expect(extrem.isCalculable).toBe(false);
    expect(extrem.erros.some((e) => e.includes("Overflow"))).toBe(true);
  });

  it("deve tratar ponto de equilibrio não calculável se margem unitaria <= 0", () => {
    const negMargin = {
      ...baseValidInputs,
      precoTitular: 10,
      precoDependente: 10,
      custoDispositivos: 50, // margem negativa
    };
    const res = calcularRentabilidade(negMargin);
    expect(res.isCalculable).toBe(true);
    expect(res.contribuicaoMensal).toBeLessThan(0);
    expect(res.equilibrioVidas).toBeNull();
  });
});
