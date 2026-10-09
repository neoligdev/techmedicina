import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TelemedicinePlanBase, ServiceConditions } from "../types";
import { AlertCircle, Save, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface TelemedicineFormProps {
  initialPlan: TelemedicinePlanBase;
  onSave: (plan: TelemedicinePlanBase) => void;
  onCancel: () => void;
}

export function TelemedicineForm({ initialPlan, onSave, onCancel }: TelemedicineFormProps) {
  const [plan, setPlan] = useState<TelemedicinePlanBase>(initialPlan);
  const [error, setError] = useState<string | null>(null);

  const handleServiceToggle = (
    key: keyof Omit<TelemedicinePlanBase, "id" | "type" | "name" | "status" | "createdAt">,
    checked: boolean,
  ) => {
    setPlan({
      ...plan,
      [key]: { ...plan[key], enabled: checked },
    });
  };

  const handleServiceNumber = (
    key: keyof Omit<TelemedicinePlanBase, "id" | "type" | "name" | "status" | "createdAt">,
    field: keyof Omit<ServiceConditions, "enabled">,
    value: string,
  ) => {
    setError(null);
    if (value.trim() === "") {
      setPlan({
        ...plan,
        [key]: { ...plan[key], [field]: null },
      });
      return;
    }

    const num = parseFloat(value);
    if (Number.isNaN(num) || !Number.isFinite(num) || num < 0) {
      setError("Valores devem ser números positivos.");
      return;
    }

    setPlan({
      ...plan,
      [key]: { ...plan[key], [field]: num },
    });
  };

  const handleSave = () => {
    if (!plan.name.trim()) {
      setError("O plano deve ter um nome.");
      return;
    }
    onSave({ ...plan, status: "draft" });
  };

  const renderServiceSettings = (
    title: string,
    description: string,
    key: keyof Omit<TelemedicinePlanBase, "id" | "type" | "name" | "status" | "createdAt">,
  ) => {
    const service = plan[key] as ServiceConditions;
    return (
      <div
        className="border border-border bg-card rounded-lg overflow-hidden mb-4 shadow-sm"
        key={key}
      >
        <div className="flex items-center justify-between p-4 bg-muted/30">
          <div className="flex items-center gap-4">
            <Switch
              id={`toggle-${key}`}
              checked={service.enabled}
              onCheckedChange={(checked) => handleServiceToggle(key, checked)}
              aria-label={`Habilitar ${title}`}
            />
            <div className="flex flex-col">
              <Label htmlFor={`toggle-${key}`} className="font-semibold text-sm cursor-pointer">
                {title}
              </Label>
              <span className="text-xs text-muted-foreground font-normal">{description}</span>
            </div>
          </div>
        </div>

        {service.enabled && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="options" className="border-b-0">
              <AccordionTrigger className="px-4 py-2 text-sm text-muted-foreground hover:no-underline bg-muted/10">
                Ver opções comerciais (opcional)
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${key}-copart`}>Coparticipação (R$)</Label>
                    <Input
                      id={`${key}-copart`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={service.coparticipacao !== null ? service.coparticipacao : ""}
                      onChange={(e) => handleServiceNumber(key, "coparticipacao", e.target.value)}
                      placeholder="Não cobrado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${key}-carencia`}>Carência (Opcional)</Label>
                    <Input
                      id={`${key}-carencia`}
                      type="number"
                      min="0"
                      step="1"
                      value={service.carencia !== null ? service.carencia : ""}
                      onChange={(e) => handleServiceNumber(key, "carencia", e.target.value)}
                      placeholder="Sem regra/unidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${key}-fidelidade`}>Fidelidade (Opcional)</Label>
                    <Input
                      id={`${key}-fidelidade`}
                      type="number"
                      min="0"
                      step="1"
                      value={service.fidelidade !== null ? service.fidelidade : ""}
                      onChange={(e) => handleServiceNumber(key, "fidelidade", e.target.value)}
                      placeholder="Sem regra/unidade"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  * Notas: Unidades de carência e fidelidade, bem como a sua aplicação técnica,
                  estão pendentes de aprovação pelo negócio. Estes campos têm apenas caráter
                  demonstrativo no momento.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <Alert variant="default" className="bg-muted text-muted-foreground border-none">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Modo Rascunho</AlertTitle>
        <AlertDescription>
          Este plano será salvo apenas como rascunho local. A ativação comercial para clínicas não
          está autorizada. Nenhum serviço garante urgência ou atendimento em tempo real.
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
          <CardTitle>Identificação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="plan-name">Nome do Plano</Label>
            <Input
              id="plan-name"
              value={plan.name}
              onChange={(e) => {
                setError(null);
                setPlan({ ...plan, name: e.target.value });
              }}
              placeholder="Ex: Telemedicina Essencial"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Serviços Habilitados</CardTitle>
          <CardDescription>
            Selecione quais módulos a clínica pode comercializar. A disponibilização de médicos e
            especialidades está sujeita ao catálogo e à disponibilidade real.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 bg-blue-50/50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
            <Info className="h-4 w-4" />
            <AlertTitle>Nota sobre Especialidades (Grupo 32)</AlertTitle>
            <AlertDescription className="text-sm">
              As áreas de Psicologia e Nutrição podem possuir sobreposição com o Grupo de 32
              Especialidades. No momento, estão separadas no formulário, mas não há lista fechada ou
              cobrança duplicada definida logicamente.
            </AlertDescription>
          </Alert>

          {renderServiceSettings(
            "Pronto Atendimento 24h",
            "Clínico Geral para baixa complexidade sob demanda. (Não garante tempo real/urgências vitais).",
            "prontoAtendimento24h",
          )}
          {renderServiceSettings(
            "Atendimento Agendado",
            "Clínico Geral com agendamento prévio.",
            "prontoAtendimentoAgendado",
          )}
          {renderServiceSettings(
            "Especialidades Médicas",
            "Acesso ao conjunto de especialidades (sujeito a alterações).",
            "especialidadesMedicas",
          )}
          {renderServiceSettings("Nutrição", "Consultas agendadas com nutricionistas.", "nutricao")}
          {renderServiceSettings("Psicologia", "Consultas agendadas com psicólogos.", "psicologia")}
          {renderServiceSettings("Educador Físico", "Orientação de exercícios.", "educadorFisico")}
          {renderServiceSettings(
            "Concierge Presencial",
            "Suporte assistencial e informativo.",
            "conciergePresencial",
          )}
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
