import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Activity, Watch, Trash2, Edit, AlertCircle, AlertTriangle } from "lucide-react";
import { getPlans, savePlans, backupAndClearPlans } from "./storage";
import {
  PlanBase,
  TelemedicinePlanBase,
  BraceletPlanBase,
  createDefaultServiceConditions,
} from "./types";
import { Badge } from "@/components/ui/badge";
import { TelemedicineForm } from "./components/telemedicine-form";
import { BraceletForm } from "./components/bracelet-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalogComponentsView } from "./components/catalog-components-view";
import { ClinicPoliciesPanel } from "./components/clinic-policies-panel";

const formatPrice = (val: number | null) => {
  if (val === null || val === undefined) return "Não definido";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
};

export interface PlansCatalogProps {
  defaultTab?: "policies" | "catalog" | "drafts";
}

export function PlansCatalog({ defaultTab = "drafts" }: PlansCatalogProps = {}) {
  const [activeTab, setActiveTab] = useState<"policies" | "catalog" | "drafts">(defaultTab);
  const [plans, setPlans] = useState<PlanBase[]>([]);
  const [editingPlan, setEditingPlan] = useState<PlanBase | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalWarning, setGlobalWarning] = useState<string | null>(null);
  const [recoveryNeeded, setRecoveryNeeded] = useState<boolean>(false);
  const [readFailed, setReadFailed] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);

  const loadPlans = () => {
    const res = getPlans();
    setPlans(res.plans);
    if (res.error) setGlobalError(res.error);
    else setGlobalError(null);
    if (res.warning) setGlobalWarning(res.warning);
    else setGlobalWarning(null);
    setReadFailed(!!res.readFailed);
    if (res.recoveryNeeded) {
      setRecoveryNeeded(res.recoveryNeeded);
      setRawContent(res.rawContent || null);
    } else {
      setRecoveryNeeded(false);
      setRawContent(null);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleForceRecovery = () => {
    if (rawContent) {
      const res = backupAndClearPlans(rawContent, plans);
      if (res.success) {
        setRecoveryNeeded(false);
        setGlobalError(null);
        setGlobalWarning(
          `Recuperação concluída. Backup dos dados corrompidos salvo em: ${res.backupKey}`,
        );
        setRawContent(null);
      } else {
        setGlobalError(`Falha ao recuperar base: ${res.error}`);
      }
    } else {
      setGlobalError("Não foi possível encontrar o conteúdo bruto para backup.");
    }
  };

  const handleSave = (plan: PlanBase) => {
    setGlobalError(null);
    const isNew = !plans.find((p) => p.id === plan.id);
    const newPlans = isNew ? [...plans, plan] : plans.map((p) => (p.id === plan.id ? plan : p));

    const result = savePlans(newPlans);
    if (result.success) {
      setPlans(newPlans);
      setEditingPlan(null);
      setGlobalWarning(null);
    } else {
      setGlobalError(`Falha ao salvar o plano: ${result.error}`);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
  };

  const handleDelete = (id: string) => {
    setGlobalError(null);
    const newPlans = plans.filter((p) => p.id !== id);
    const result = savePlans(newPlans);
    if (result.success) {
      setPlans(newPlans);
      setDeletingId(null);
      setGlobalWarning(null);
    } else {
      setGlobalError(`Falha ao remover o plano: ${result.error}`);
      setDeletingId(null);
    }
  };

  const handleCreateTelemedicine = () => {
    setGlobalError(null);
    const newPlan: TelemedicinePlanBase = {
      id: crypto.randomUUID(),
      type: "telemedicine",
      name: "Novo Plano de Telemedicina",
      status: "draft",
      createdAt: new Date().toISOString(),
      prontoAtendimento24h: createDefaultServiceConditions(),
      prontoAtendimentoAgendado: createDefaultServiceConditions(),
      especialidadesMedicas: createDefaultServiceConditions(),
      nutricao: createDefaultServiceConditions(),
      psicologia: createDefaultServiceConditions(),
      educadorFisico: createDefaultServiceConditions(),
      conciergePresencial: createDefaultServiceConditions(),
    };
    setEditingPlan(newPlan);
  };

  const handleCreateBracelet = () => {
    setGlobalError(null);
    const newPlan: BraceletPlanBase = {
      id: crypto.randomUUID(),
      type: "bracelet",
      name: "Nova Pulseira Inteligente",
      status: "draft",
      createdAt: new Date().toISOString(),
      precoAtivacao: null,
      precoMensalidade: null,
      comMedico: false,
      comIA: false,
      comFidelidade: false,
    };
    setEditingPlan(newPlan);
  };

  const isLocked = recoveryNeeded || readFailed;

  if (editingPlan) {
    return (
      <div className="space-y-6">
        {globalError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{globalError}</AlertDescription>
          </Alert>
        )}
        {editingPlan.type === "telemedicine" ? (
          <TelemedicineForm
            initialPlan={editingPlan}
            onSave={handleSave}
            onCancel={() => setEditingPlan(null)}
          />
        ) : (
          <BraceletForm
            initialPlan={editingPlan}
            onSave={handleSave}
            onCancel={() => setEditingPlan(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Planos, Políticas Comerciais e Limites
          </h2>
          <p className="text-muted-foreground text-sm">
            Gestão de políticas por clínica, quotas operacionais e catálogo oficial de módulos e
            dispositivos (PRD v0.11.3).
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "policies" | "catalog" | "drafts")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="policies">Políticas por Clínica</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo Oficial</TabsTrigger>
          <TabsTrigger value="drafts">Rascunhos de Planos</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-6 space-y-6">
          <ClinicPoliciesPanel />
        </TabsContent>

        <TabsContent value="catalog" className="mt-6 space-y-6">
          <CatalogComponentsView />
        </TabsContent>

        <TabsContent value="drafts" className="mt-6 space-y-6">
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleCreateTelemedicine}
              disabled={isLocked}
              variant="outline"
              size="sm"
            >
              <Activity className="mr-2 h-4 w-4" />
              Criar Telemedicina
            </Button>
            <Button onClick={handleCreateBracelet} disabled={isLocked} variant="outline" size="sm">
              <Watch className="mr-2 h-4 w-4" />
              Criar Pulseira
            </Button>
          </div>

          {globalError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro de Persistência</AlertTitle>
              <AlertDescription>
                <p className="mb-2">{globalError}</p>
                {recoveryNeeded && rawContent && (
                  <div className="mt-4 p-4 border border-destructive/20 rounded-md bg-destructive/10">
                    <p className="mb-4 font-semibold">
                      Tem certeza que deseja forçar a recuperação?
                    </p>
                    <p className="mb-4 text-sm">
                      Um backup do conteúdo atual será criado, e apenas os planos válidos serão
                      preservados. Planos com formato corrompido ou IDs duplicados serão
                      descartados.
                    </p>
                    <Button variant="destructive" size="sm" onClick={handleForceRecovery}>
                      Confirmar Recuperação e Criar Backup
                    </Button>
                  </div>
                )}
                {readFailed && (
                  <Button variant="outline" size="sm" onClick={loadPlans} className="mt-2">
                    Tentar novamente
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {globalWarning && !isLocked && (
            <Alert
              variant="default"
              className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="h-4 w-4 !text-amber-700 dark:!text-amber-400" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>{globalWarning}</AlertDescription>
            </Alert>
          )}

          {!isLocked && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.length === 0 && (
                <div className="col-span-full py-12 text-center border rounded-lg border-dashed">
                  <p className="text-muted-foreground">Nenhum plano base cadastrado.</p>
                </div>
              )}

              {plans.map((plan) => {
                return (
                  <Card key={plan.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1 min-w-0">
                          <CardTitle className="text-lg leading-tight break-words min-w-0">
                            {plan.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            {plan.type === "telemedicine" ? (
                              <>
                                <Activity className="h-3 w-3" /> Telemedicina
                              </>
                            ) : (
                              <>
                                <Watch className="h-3 w-3" /> Pulseira Inteligente
                              </>
                            )}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">Rascunho</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground mb-4">
                        Criado em: {new Date(plan.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                      {plan.type === "telemedicine" && (
                        <div className="text-sm space-y-2">
                          {[
                            { label: "Pronto Atendimento 24h", s: plan.prontoAtendimento24h },
                            { label: "Atendimento Agendado", s: plan.prontoAtendimentoAgendado },
                            { label: "Especialidades Médicas", s: plan.especialidadesMedicas },
                            { label: "Nutrição", s: plan.nutricao },
                            { label: "Psicologia", s: plan.psicologia },
                            { label: "Educador Físico", s: plan.educadorFisico },
                            { label: "Concierge Presencial", s: plan.conciergePresencial },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${item.s.enabled ? "bg-primary" : "bg-muted"}`}
                                />
                                <span className="truncate">{item.label}</span>
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0 font-medium">
                                {item.s.enabled ? "Habilitado" : "Não incluído"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {plan.type === "bracelet" && (
                        <div className="text-sm space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${plan.precoAtivacao !== null ? "bg-primary" : "bg-muted"}`}
                              />
                              <span>Ativação</span>
                            </div>
                            <span className="font-medium">{formatPrice(plan.precoAtivacao)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${plan.precoMensalidade !== null ? "bg-primary" : "bg-muted"}`}
                              />
                              <span>Mensalidade</span>
                            </div>
                            <span className="font-medium">
                              {formatPrice(plan.precoMensalidade)}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-col items-stretch gap-2 pt-4 border-t">
                      {deletingId === plan.id ? (
                        <div className="flex w-full gap-2 animate-in fade-in zoom-in duration-200">
                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handleDelete(plan.id)}
                            aria-label={`Confirmar exclusão de ${plan.name}`}
                          >
                            Confirmar
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setDeletingId(null)}
                            aria-label="Cancelar exclusão"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex w-full justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingPlan(plan)}
                            aria-label={`Editar ${plan.name}`}
                          >
                            <Edit className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(plan.id)}
                            aria-label={`Remover ${plan.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                          </Button>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
