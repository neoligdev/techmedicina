export interface SimulatorInputs {
  titulares: number | null;
  dependentes: number | null;
  precoTitular: number | null;
  precoDependente: number | null;
  impostosTaxasComissoesPerc: number | null;
  custoMedicos: number | null;
  custoIA: number | null;
  custoDispositivos: number | null;
  custosFixosMensais: number | null;
  custoUnicoImplantacao: number | null;
  custoUnicoDispositivo: number | null;
}

export interface SimulatorResults {
  isCalculable: boolean;
  vidas: number;
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custosRecorrentesUnitarios: number;
  custosRecorrentesTotais: number;
  contribuicaoMensal: number;
  equilibrioVidas: number | null;
  custosUnicosUnitarios: number;
  custosUnicosTotais: number;
  erros: string[];
}

function isInvalidNumber(val: number | null): boolean {
  if (val === null) return true;
  if (Number.isNaN(val)) return true;
  if (!Number.isFinite(val)) return true;
  return false;
}

export function calcularRentabilidade(inputs: SimulatorInputs): SimulatorResults {
  const erros: string[] = [];

  const allKeys: (keyof SimulatorInputs)[] = [
    "titulares",
    "dependentes",
    "precoTitular",
    "precoDependente",
    "impostosTaxasComissoesPerc",
    "custoMedicos",
    "custoIA",
    "custoDispositivos",
    "custosFixosMensais",
    "custoUnicoImplantacao",
    "custoUnicoDispositivo",
  ];

  let missing = false;
  for (const k of allKeys) {
    if (isInvalidNumber(inputs[k])) {
      missing = true;
    } else {
      // TODOS os campos numéricos devem ser >= 0
      if ((inputs[k] as number) < 0) {
        erros.push(`O campo não pode conter valores negativos (${k}).`);
      }
    }
  }

  if (missing) {
    erros.push("Existem campos obrigatórios em branco ou inválidos.");
  }

  if (inputs.titulares !== null && !Number.isSafeInteger(inputs.titulares)) {
    erros.push("Titulares deve ser um número inteiro seguro.");
  }
  if (inputs.dependentes !== null && !Number.isSafeInteger(inputs.dependentes)) {
    erros.push("Dependentes deve ser um número inteiro seguro.");
  }
  if (
    inputs.impostosTaxasComissoesPerc !== null &&
    (inputs.impostosTaxasComissoesPerc < 0 || inputs.impostosTaxasComissoesPerc > 100)
  ) {
    erros.push("Percentual de impostos e taxas deve estar entre 0 e 100.");
  }

  if (erros.length > 0 || missing) {
    return {
      isCalculable: false,
      vidas: 0,
      receitaBruta: 0,
      deducoes: 0,
      receitaLiquida: 0,
      custosRecorrentesUnitarios: 0,
      custosRecorrentesTotais: 0,
      contribuicaoMensal: 0,
      equilibrioVidas: null,
      custosUnicosUnitarios: 0,
      custosUnicosTotais: 0,
      erros: Array.from(new Set(erros)), // distinct errors
    };
  }

  const t = inputs.titulares as number;
  const d = inputs.dependentes as number;
  const pt = inputs.precoTitular as number;
  const pd = inputs.precoDependente as number;
  const perc = inputs.impostosTaxasComissoesPerc as number;
  const cMed = inputs.custoMedicos as number;
  const cIa = inputs.custoIA as number;
  const cDisp = inputs.custoDispositivos as number;
  const cFixos = inputs.custosFixosMensais as number;
  const cUImp = inputs.custoUnicoImplantacao as number;
  const cUDisp = inputs.custoUnicoDispositivo as number;

  const vidas = t + d;
  const receitaBruta = t * pt + d * pd;
  const deducoes = receitaBruta * (perc / 100);
  const receitaLiquida = receitaBruta - deducoes;

  const custosRecorrentesUnitarios = cMed + cIa + cDisp;
  const custosRecorrentesTotais = vidas * custosRecorrentesUnitarios + cFixos;

  const contribuicaoMensal = receitaLiquida - custosRecorrentesTotais;

  let equilibrioVidas: number | null = null;

  if (vidas > 0) {
    const receitaMediaUnitaria = receitaLiquida / vidas;
    const contribuicaoUnitariaMedia = receitaMediaUnitaria - custosRecorrentesUnitarios;

    if (contribuicaoUnitariaMedia > 0) {
      equilibrioVidas = Math.ceil(cFixos / contribuicaoUnitariaMedia);
    }
  }

  const custosUnicosUnitarios = cUImp + cUDisp;
  const custosUnicosTotais = vidas * custosUnicosUnitarios;

  // Proteção final contra overflows astronômicos de JS
  if (
    !Number.isSafeInteger(vidas) ||
    !Number.isFinite(receitaBruta) ||
    !Number.isFinite(custosRecorrentesTotais) ||
    !Number.isFinite(custosUnicosTotais) ||
    (equilibrioVidas !== null && !Number.isFinite(equilibrioVidas))
  ) {
    return {
      isCalculable: false,
      vidas: 0,
      receitaBruta: 0,
      deducoes: 0,
      receitaLiquida: 0,
      custosRecorrentesUnitarios: 0,
      custosRecorrentesTotais: 0,
      contribuicaoMensal: 0,
      equilibrioVidas: null,
      custosUnicosUnitarios: 0,
      custosUnicosTotais: 0,
      erros: ["Estouro numérico (Overflow) na simulação dos valores."],
    };
  }

  return {
    isCalculable: true,
    vidas,
    receitaBruta,
    deducoes,
    receitaLiquida,
    custosRecorrentesUnitarios,
    custosRecorrentesTotais,
    contribuicaoMensal,
    equilibrioVidas,
    custosUnicosUnitarios,
    custosUnicosTotais,
    erros: [],
  };
}
