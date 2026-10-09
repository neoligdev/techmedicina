import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertCircle } from "lucide-react";
import { calcularRentabilidade, SimulatorInputs, SimulatorResults } from "./calculator";

type ScenarioKey = "conservador" | "base" | "expansao";

const emptyInputs: SimulatorInputs = {
  titulares: null,
  dependentes: null,
  precoTitular: null,
  precoDependente: null,
  impostosTaxasComissoesPerc: null,
  custoMedicos: null,
  custoIA: null,
  custoDispositivos: null,
  custosFixosMensais: null,
  custoUnicoImplantacao: null,
  custoUnicoDispositivo: null,
};

const dummyExample: SimulatorInputs = {
  titulares: 100,
  dependentes: 150,
  precoTitular: 50,
  precoDependente: 30,
  impostosTaxasComissoesPerc: 15,
  custoMedicos: 5,
  custoIA: 1.5,
  custoDispositivos: 8,
  custosFixosMensais: 2000,
  custoUnicoImplantacao: 15,
  custoUnicoDispositivo: 80,
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
};

const InputRow = ({
  label,
  field,
  value,
  onChange,
  min,
  step,
}: {
  label: string;
  field: string;
  value: number | null;
  onChange: (v: string) => void;
  min?: string;
  step?: string;
}) => (
  <div className="grid gap-2">
    <Label htmlFor={field}>{label}</Label>
    <Input
      id={field}
      type="number"
      min={min}
      step={step}
      value={value === null ? "" : value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ex: 0"
    />
  </div>
);

export function SimulatorPage() {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey | "comparativo">("base");

  const [scenarios, setScenarios] = useState<Record<ScenarioKey, SimulatorInputs>>({
    conservador: { ...emptyInputs },
    base: { ...emptyInputs },
    expansao: { ...emptyInputs },
  });

  const handleFillDummy = () => {
    if (activeScenario === "comparativo") return;
    setScenarios((prev) => ({
      ...prev,
      [activeScenario]: { ...dummyExample },
    }));
  };

  const handleReset = () => {
    if (activeScenario === "comparativo") return;
    setScenarios((prev) => ({
      ...prev,
      [activeScenario]: { ...emptyInputs },
    }));
  };

  const handleInputChange = (field: keyof SimulatorInputs, value: string) => {
    if (activeScenario === "comparativo") return;
    const val = value.trim() === "" ? null : Number(value);
    setScenarios((prev) => ({
      ...prev,
      [activeScenario as ScenarioKey]: {
        ...prev[activeScenario as ScenarioKey],
        [field]: val,
      },
    }));
  };

  const results: Record<ScenarioKey, SimulatorResults> = {
    conservador: calcularRentabilidade(scenarios.conservador),
    base: calcularRentabilidade(scenarios.base),
    expansao: calcularRentabilidade(scenarios.expansao),
  };

  const maxContribuicao = Math.max(
    0,
    ...(["conservador", "base", "expansao"] as ScenarioKey[])
      .filter((k) => results[k].isCalculable)
      .map((k) => Math.abs(results[k].contribuicaoMensal)),
  );

  const renderScenarioInputsAndResults = (scenarioKey: ScenarioKey) => {
    const inputs = scenarios[scenarioKey];
    const res = results[scenarioKey];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* INSUMOS (FORM) */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vidas e Preços (Receita)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <InputRow
                label="Qtd. Titulares"
                field="titulares"
                value={inputs.titulares}
                onChange={(v) => handleInputChange("titulares", v)}
                min="0"
                step="1"
              />
              <InputRow
                label="Qtd. Dependentes"
                field="dependentes"
                value={inputs.dependentes}
                onChange={(v) => handleInputChange("dependentes", v)}
                min="0"
                step="1"
              />
              <InputRow
                label="Mensalidade Titular (R$)"
                field="precoTitular"
                value={inputs.precoTitular}
                onChange={(v) => handleInputChange("precoTitular", v)}
                min="0"
                step="0.01"
              />
              <InputRow
                label="Mensalidade Dependente (R$)"
                field="precoDependente"
                value={inputs.precoDependente}
                onChange={(v) => handleInputChange("precoDependente", v)}
                min="0"
                step="0.01"
              />
              <div className="col-span-2">
                <InputRow
                  label="Impostos/Taxas/Comissões (%)"
                  field="impostosTaxasComissoesPerc"
                  value={inputs.impostosTaxasComissoesPerc}
                  onChange={(v) => handleInputChange("impostosTaxasComissoesPerc", v)}
                  min="0"
                  step="0.1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custos Recorrentes Mensais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <InputRow
                label="Médico por vida (R$)"
                field="custoMedicos"
                value={inputs.custoMedicos}
                onChange={(v) => handleInputChange("custoMedicos", v)}
                min="0"
                step="0.01"
              />
              <InputRow
                label="IA por vida (R$)"
                field="custoIA"
                value={inputs.custoIA}
                onChange={(v) => handleInputChange("custoIA", v)}
                min="0"
                step="0.01"
              />
              <div className="col-span-2">
                <InputRow
                  label="Manutenção Disp. por vida (R$)"
                  field="custoDispositivos"
                  value={inputs.custoDispositivos}
                  onChange={(v) => handleInputChange("custoDispositivos", v)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-2 border-t pt-4 mt-2">
                <InputRow
                  label="Custos Fixos Totais/Mês (Operação) (R$)"
                  field="custosFixosMensais"
                  value={inputs.custosFixosMensais}
                  onChange={(v) => handleInputChange("custosFixosMensais", v)}
                  min="0"
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custos Únicos (Implantação)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <InputRow
                label="Kit Implantação p/ vida (R$)"
                field="custoUnicoImplantacao"
                value={inputs.custoUnicoImplantacao}
                onChange={(v) => handleInputChange("custoUnicoImplantacao", v)}
                min="0"
                step="0.01"
              />
              <InputRow
                label="Custo Hardware p/ vida (R$)"
                field="custoUnicoDispositivo"
                value={inputs.custoUnicoDispositivo}
                onChange={(v) => handleInputChange("custoUnicoDispositivo", v)}
                min="0"
                step="0.01"
              />
            </CardContent>
          </Card>
        </div>

        {/* RESULTADOS */}
        <div className="lg:col-span-7">
          {!res.isCalculable ? (
            <Card className="border-dashed border-2 bg-muted/20 flex items-center justify-center min-h-[400px]">
              <CardContent className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                <Info className="w-12 h-12 text-muted-foreground opacity-50" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Estado Incompleto</h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    Preencha todos os campos do cenário (ou informe zero) para visualizar as
                    estimativas financeiras didáticas.
                  </p>
                </div>
                {res.erros.length > 0 && (
                  <ul className="text-sm text-destructive mt-4 text-left list-disc pl-4">
                    {res.erros.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 flex flex-col justify-center">
                    <p className="text-sm text-muted-foreground">Vidas habilitadas na simulação</p>
                    <p className="text-2xl font-bold">{res.vidas}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col justify-center">
                    <p className="text-sm text-muted-foreground">Receita Bruta</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(res.receitaBruta)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col justify-center">
                    <p className="text-sm text-muted-foreground">Deduções</p>
                    <p className="text-xl font-bold text-destructive">
                      {formatCurrency(res.deducoes)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5">
                  <CardContent className="p-4 flex flex-col justify-center">
                    <p className="text-sm text-muted-foreground">Receita após deduções</p>
                    <p className="text-xl font-bold">{formatCurrency(res.receitaLiquida)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Resultados Recorrentes Mensais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">
                      Custos Recorrentes Unitários (Médico+IA+Disp)
                    </span>
                    <span className="font-medium">
                      {formatCurrency(res.custosRecorrentesUnitarios)} / vida
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">
                      Custos Recorrentes Totais (inclui fixos)
                    </span>
                    <span className="font-medium text-destructive">
                      {formatCurrency(res.custosRecorrentesTotais)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-medium">Contribuição Estimada Mensal</span>
                    <span
                      className={`text-2xl font-bold ${res.contribuicaoMensal >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
                    >
                      {formatCurrency(res.contribuicaoMensal)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Análise de Viabilidade (Ponto de Equilíbrio)</CardTitle>
                </CardHeader>
                <CardContent>
                  {res.equilibrioVidas !== null ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-3xl font-bold">
                        {res.equilibrioVidas}{" "}
                        <span className="text-lg font-normal text-muted-foreground">vidas</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Mantendo-se a proporção titular/dependente informada, são necessárias{" "}
                        {res.equilibrioVidas} vidas para cobrir os custos fixos (
                        {formatCurrency(inputs.custosFixosMensais || 0)}).
                      </p>
                    </div>
                  ) : (
                    <Alert variant="destructive" className="bg-destructive/10 border-none">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Não calculável. A contribuição média por vida é negativa ou zero.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card className="border-dashed bg-muted/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Impacto Único de Implantação (Capital Inicial)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Custo Único Total ({res.vidas} vidas)
                    </span>
                    <span className="font-bold break-words text-right max-w-[50%]">
                      {formatCurrency(res.custosUnicosTotais)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Valores pontuais cobrados apenas na entrada do paciente, não incluídos no
                    resultado mensal calculado acima.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 max-w-7xl">
      <div className="flex flex-col gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Simulador de Rentabilidade (Didático)
        </h1>
        <div className="text-muted-foreground text-sm space-y-2 max-w-4xl">
          <p>
            Ferramenta de estimativa didática baseada em premissas explícitas preenchidas pelo
            usuário. Não utiliza custos hardcoded de backend nem margens reais comerciais embutidas.
          </p>
          <div className="bg-muted/30 p-4 rounded border font-mono text-xs text-muted-foreground mt-4">
            <p className="mb-2 font-bold uppercase text-foreground">Fórmulas Aplicadas</p>
            <p>
              • <strong>Receita Bruta</strong> = (Titulares × Preço Titular) + (Dependentes × Preço
              Dependente)
            </p>
            <p>
              • <strong>Deduções</strong> = Receita Bruta × (% Impostos, Taxas e Comissões)
            </p>
            <p>
              • <strong>Receita após deduções</strong> = Receita Bruta - Deduções
            </p>
            <p>
              • <strong>Custos Recorrentes Unitários</strong> = (Custo Médico + Custo IA +
              Manutenção Dispositivo)
            </p>
            <p>
              • <strong>Custos Recorrentes Totais</strong> = (Vidas habilitadas × Custos Recorrentes
              Unitários) + Custos Fixos Mensais
            </p>
            <p>
              • <strong>Contribuição Mensal</strong> = Receita após deduções - Custos Recorrentes
              Totais
            </p>
            <p>
              • <strong>Ponto de Equilíbrio (Vidas)</strong> = Custos Fixos Mensais ÷ [(Receita após
              deduções ÷ Vidas habilitadas) - Custos Recorrentes Unitários]
            </p>
          </div>
        </div>
      </div>

      <Tabs
        value={activeScenario}
        onValueChange={(v) => setActiveScenario(v as ScenarioKey | "comparativo")}
        className="space-y-6"
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <TabsList>
            <TabsTrigger value="conservador">Conservador</TabsTrigger>
            <TabsTrigger value="base">Base</TabsTrigger>
            <TabsTrigger value="expansao">Expansão</TabsTrigger>
            <TabsTrigger value="comparativo" className="font-bold">
              Comparativo
            </TabsTrigger>
          </TabsList>

          {activeScenario !== "comparativo" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Limpar Cenário
              </Button>
              <Button variant="secondary" size="sm" onClick={handleFillDummy}>
                Preencher Exemplo Fictício
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="conservador" className="border-none p-0">
          {renderScenarioInputsAndResults("conservador")}
        </TabsContent>
        <TabsContent value="base" className="border-none p-0">
          {renderScenarioInputsAndResults("base")}
        </TabsContent>
        <TabsContent value="expansao" className="border-none p-0">
          {renderScenarioInputsAndResults("expansao")}
        </TabsContent>

        <TabsContent value="comparativo" className="border-none p-0 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparação de Cenários</CardTitle>
              <CardDescription>
                Resumo textual dos resultados mensais das simulações válidas preenchidas nas abas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(["conservador", "base", "expansao"] as ScenarioKey[]).map((key) => {
                  const r = results[key];
                  const val = r.isCalculable ? r.contribuicaoMensal : 0;
                  const valAbs = Math.abs(val);
                  const percent = maxContribuicao > 0 ? (valAbs / maxContribuicao) * 100 : 0;
                  const isPositive = val >= 0;

                  return (
                    <div key={key} className="border rounded-lg p-4 bg-muted/10 space-y-4">
                      <h3 className="font-bold uppercase tracking-wider text-sm border-b pb-2">
                        {key}
                      </h3>
                      {!r.isCalculable ? (
                        <p className="text-muted-foreground text-sm">
                          Cenário incompleto ou com dados inválidos.
                        </p>
                      ) : (
                        <div className="space-y-4 text-sm">
                          <div
                            className="space-y-1"
                            role="img"
                            aria-label={`Gráfico de Contribuição: ${formatCurrency(val)}`}
                          >
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-muted-foreground">
                                Contribuição (Gráfico)
                              </span>
                              <span
                                className={
                                  isPositive
                                    ? "text-green-600 dark:text-green-400 font-bold"
                                    : "text-destructive font-bold"
                                }
                              >
                                {formatCurrency(val)}
                              </span>
                            </div>
                            <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  isPositive ? "bg-green-500" : "bg-destructive"
                                }`}
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Vidas:</span>
                              <span className="font-medium">{r.vidas}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Receita Bruta:</span>
                              <span className="font-medium">{formatCurrency(r.receitaBruta)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Deduções:</span>
                              <span className="font-medium">{formatCurrency(r.deducoes)}</span>
                            </div>
                            <div className="flex justify-between font-bold border-t pt-2">
                              <span>Contribuição:</span>
                              <span
                                className={
                                  r.contribuicaoMensal >= 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-destructive"
                                }
                              >
                                {formatCurrency(r.contribuicaoMensal)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1">
                              <span className="text-muted-foreground">Ponto Equilíbrio:</span>
                              <span className="font-medium">
                                {r.equilibrioVidas !== null
                                  ? `${r.equilibrioVidas} vidas`
                                  : "Inválido"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
