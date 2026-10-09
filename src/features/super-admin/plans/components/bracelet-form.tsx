import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BraceletPlanBase } from "../types";
import { AlertCircle, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BraceletFormProps {
  initialPlan: BraceletPlanBase;
  onSave: (plan: BraceletPlanBase) => void;
  onCancel: () => void;
}

export function BraceletForm({ initialPlan, onSave, onCancel }: BraceletFormProps) {
  const [plan, setPlan] = useState<BraceletPlanBase>(initialPlan);
  const [error, setError] = useState<string | null>(null);

  const handleNumberChange = (field: keyof BraceletPlanBase, value: string) => {
    setError(null);
    if (value.trim() === "") {
      setPlan({ ...plan, [field]: null });
      return;
    }
    const num = parseFloat(value);
    if (Number.isNaN(num) || !Number.isFinite(num) || num < 0) {
      setError("Valores monetários devem ser números positivos.");
      return;
    }
    setPlan({ ...plan, [field]: num });
  };

  const handleSave = () => {
    if (!plan.name.trim()) {
      setError("O plano deve ter um nome.");
      return;
    }
    // Plan remains draft
    onSave({ ...plan, status: "draft" });
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Alert variant="default" className="bg-muted text-muted-foreground border-none">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Modo Rascunho</AlertTitle>
        <AlertDescription>
          Este plano será salvo apenas como rascunho local. A ativação comercial para clínicas não
          está autorizada no momento.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de Validação</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="plan-name">Nome do Plano</Label>
            <Input
              id="plan-name"
              value={plan.name}
              onChange={(e) => {
                setError(null);
                setPlan({ ...plan, name: e.target.value });
              }}
              placeholder="Ex: Pulseira Vital"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="activation-price">Preço-base de Ativação (R$)</Label>
              <Input
                id="activation-price"
                type="number"
                min="0"
                step="0.01"
                value={plan.precoAtivacao !== null ? plan.precoAtivacao : ""}
                onChange={(e) => handleNumberChange("precoAtivacao", e.target.value)}
                placeholder="Ex: 50.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="monthly-price">Preço-base de Mensalidade (R$)</Label>
              <Input
                id="monthly-price"
                type="number"
                min="0"
                step="0.01"
                value={plan.precoMensalidade !== null ? plan.precoMensalidade : ""}
                onChange={(e) => handleNumberChange("precoMensalidade", e.target.value)}
                placeholder="Ex: 15.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recursos e Features Pretendidos</CardTitle>
          <CardDescription>
            Estas opções indicam a pretensão comercial para o produto. Detalhes de serviço, regras
            de fidelidade e termos ainda não têm vigência (regras pendentes).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="toggle-medico">Acompanhamento Médico</Label>
              <p className="text-sm text-muted-foreground">
                {plan.comMedico
                  ? "Indica que haverá conexão com profissionais de saúde (sujeito à disponibilidade)."
                  : "Não incluído neste rascunho."}
              </p>
            </div>
            <Switch
              id="toggle-medico"
              checked={plan.comMedico}
              onCheckedChange={(checked) => setPlan({ ...plan, comMedico: checked })}
            />
          </div>

          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="toggle-ia">Integração IA</Label>
              <p className="text-sm text-muted-foreground">
                {plan.comIA
                  ? "Previsão para assistente de triagem (interpretação de sinais pendente de aprovação)."
                  : "Não incluído neste rascunho."}
              </p>
            </div>
            <Switch
              id="toggle-ia"
              checked={plan.comIA}
              onCheckedChange={(checked) => setPlan({ ...plan, comIA: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="toggle-fidelidade">Com Fidelidade Comercial</Label>
              <p className="text-sm text-muted-foreground">
                {plan.comFidelidade
                  ? "Indica intenção de contrato com prazo mínimo (prazo e regras pendentes de definição)."
                  : "Sem intenção de fidelidade."}
              </p>
            </div>
            <Switch
              id="toggle-fidelidade"
              checked={plan.comFidelidade}
              onCheckedChange={(checked) => setPlan({ ...plan, comFidelidade: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50 flex justify-end gap-3 md:static md:bg-transparent md:border-0 md:p-0">
        <Button variant="outline" onClick={onCancel} className="w-full md:w-auto">
          Cancelar
        </Button>
        <Button variant="default" onClick={handleSave} className="w-full md:w-auto">
          <Save className="mr-2 h-4 w-4" /> Salvar Rascunho
        </Button>
      </div>
    </div>
  );
}
