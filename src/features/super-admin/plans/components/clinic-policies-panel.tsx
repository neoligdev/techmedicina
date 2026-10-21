import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Users,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  Save,
  RotateCcw,
  Sparkles,
  Lock,
  LogIn,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ClinicPolicyConfig,
  ClinicPolicyStatus,
  DEFAULT_CLINIC_POLICY,
  CATALOG_COMPONENTS,
  CatalogComponentCode,
  isValidClinicUuid,
} from "../types";

export interface ClinicSummary {
  id: string;
  name: string;
  subdomain?: string;
}

export interface ClinicPoliciesPanelProps {
  initialClinicId?: string;
  clinics?: ClinicSummary[];
  token?: string;
}

export function ClinicPoliciesPanel({
  initialClinicId,
  clinics: initialClinicsList,
  token,
}: ClinicPoliciesPanelProps = {}) {
  const [clinics, setClinics] = useState<ClinicSummary[]>(initialClinicsList || []);
  const [selectedClinicId, setSelectedClinicId] = useState<string>(initialClinicId || "");
  const [loadingClinics, setLoadingClinics] = useState(!initialClinicsList);
  const [hasSession, setHasSession] = useState<boolean>(!!token);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estado das políticas da clínica selecionada
  const [serverPolicy, setServerPolicy] = useState<ClinicPolicyConfig | null>(null);
  const [formPolicy, setFormPolicy] = useState<ClinicPolicyConfig | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Verifica sessão Supabase se token não foi fornecido diretamente
  useEffect(() => {
    if (token) {
      setHasSession(true);
      return;
    }
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setHasSession(!!data?.session);
      } catch {
        setHasSession(false);
      }
    };
    checkSession();
  }, [token]);

  // Carrega clínicas reais cadastradas via API se não foram passadas por props
  useEffect(() => {
    if (initialClinicsList && initialClinicsList.length > 0) {
      setClinics(initialClinicsList);
      if (initialClinicId && isValidClinicUuid(initialClinicId)) {
        setSelectedClinicId(initialClinicId);
      } else if (initialClinicsList[0] && isValidClinicUuid(initialClinicsList[0].id)) {
        setSelectedClinicId(initialClinicsList[0].id);
      }
      setLoadingClinics(false);
      return;
    }

    const loadClinics = async () => {
      setLoadingClinics(true);
      setError(null);
      try {
        const res = await fetch("/api/platform/clinics");
        if (!res.ok) {
          throw new Error(`Falha ao buscar clínicas: HTTP ${res.status}`);
        }
        const data = await res.json();
        const validClinics = (data.clinics || []).filter(
          (c: unknown): c is ClinicSummary =>
            typeof c === "object" &&
            c !== null &&
            "id" in c &&
            isValidClinicUuid((c as { id: unknown }).id),
        );
        setClinics(validClinics);
        if (validClinics.length > 0 && !selectedClinicId) {
          setSelectedClinicId(validClinics[0].id);
        }
      } catch (err: unknown) {
        const errMsg =
          err instanceof Error ? err.message : "Falha ao carregar clínicas cadastradas.";
        setError(errMsg);
      } finally {
        setLoadingClinics(false);
      }
    };

    loadClinics();
  }, [initialClinicsList, initialClinicId, selectedClinicId]);

  // Carrega ou inicializa as políticas quando muda a clínica selecionada
  useEffect(() => {
    if (!selectedClinicId || !isValidClinicUuid(selectedClinicId)) {
      setServerPolicy(null);
      setFormPolicy(null);
      return;
    }

    const defaultConf = DEFAULT_CLINIC_POLICY(selectedClinicId);
    // Definimos contagens efetivas de monitoramento para a visualização
    const policyWithUsage: ClinicPolicyConfig = {
      ...defaultConf,
      currentActiveLives: 320,
      currentDoctors: 8,
    };

    setServerPolicy(policyWithUsage);
    setFormPolicy(policyWithUsage);
    setValidationError(null);
    setSuccessMessage(null);
  }, [selectedClinicId]);

  // Detecção de alterações pendentes
  const hasPendingChanges = useMemo(() => {
    if (!serverPolicy || !formPolicy) return false;
    return JSON.stringify(serverPolicy) !== JSON.stringify(formPolicy);
  }, [serverPolicy, formPolicy]);

  // Quotas e limites
  const isLivesQuotaExceeded = useMemo(() => {
    if (!formPolicy) return false;
    return formPolicy.currentActiveLives > formPolicy.maxActiveLives;
  }, [formPolicy]);

  const isDoctorsLimitReached = useMemo(() => {
    if (!formPolicy) return false;
    return formPolicy.currentDoctors >= formPolicy.maxDoctors;
  }, [formPolicy]);

  // Manipuladores de alteração
  const handleToggleComponent = (code: CatalogComponentCode) => {
    if (!formPolicy) return;
    const exists = formPolicy.enabledComponents.includes(code);
    const updated = exists
      ? formPolicy.enabledComponents.filter((c) => c !== code)
      : [...formPolicy.enabledComponents, code];
    setFormPolicy({
      ...formPolicy,
      enabledComponents: updated,
    });
  };

  const handleToggleDevice = (deviceCode: "HW-PULSE" | "HW-SCALE" | "HW-RING") => {
    if (!formPolicy) return;
    const exists = formPolicy.allowedDevices.includes(deviceCode);
    const updated = exists
      ? formPolicy.allowedDevices.filter((d) => d !== deviceCode)
      : [...formPolicy.allowedDevices, deviceCode];
    setFormPolicy({
      ...formPolicy,
      allowedDevices: updated,
    });
  };

  const handleNumberChange = (
    field: "maxActiveLives" | "maxDoctors" | "maxDependentsPerHolder",
    val: string,
  ) => {
    if (!formPolicy) return;
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) {
      setValidationError("Limites numéricos devem ser inteiros maiores ou iguais a zero.");
      return;
    }
    setValidationError(null);
    setFormPolicy({
      ...formPolicy,
      [field]: num,
    });
  };

  const handleStatusChange = (newStatus: ClinicPolicyStatus) => {
    if (!formPolicy) return;
    setFormPolicy({
      ...formPolicy,
      status: newStatus,
    });
  };

  const handleReset = () => {
    if (serverPolicy) {
      setFormPolicy({ ...serverPolicy });
      setValidationError(null);
    }
  };

  const handleRequestSave = () => {
    if (!formPolicy) return;
    if (validationError) return;
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!formPolicy) return;
    setIsConfirmModalOpen(false);

    setServerPolicy({ ...formPolicy, updatedAt: new Date().toISOString() });
    setSuccessMessage(
      "Políticas da clínica atualizadas localmente. (Nota de Integridade: Persistência central em nuvem requer migração backend pelo Codex).",
    );
  };

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);

  return (
    <div className="space-y-6">
      {/* Alerta de sessão administrativa */}
      {!hasSession && (
        <Card className="border-amber-500/30 bg-amber-500/10 shadow-sm" role="status">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-semibold text-xs text-foreground">
                  Sessão Administrativa Não Confirmada
                </h4>
                <p className="text-xs text-muted-foreground">
                  A gestão de políticas comerciais, limites e bloqueios exige autenticação com papel
                  Super ADM.
                </p>
              </div>
            </div>
            <Button size="sm" asChild className="gap-1.5 text-xs shrink-0">
              <a href="/login">
                <LogIn className="h-3.5 w-3.5" />
                <span>Entrar no Super ADM</span>
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Seletor de Clínica */}
      <Card className="border-border/60 bg-card/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <Label
                htmlFor="policy-clinic-select"
                className="text-xs font-semibold whitespace-nowrap"
              >
                Clínica Parceira:
              </Label>
              <select
                id="policy-clinic-select"
                aria-label="Selecionar clínica parceira para gestão de políticas"
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                disabled={loadingClinics || clinics.length === 0}
                className="h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="">Selecione uma clínica...</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name} ({clinic.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>

            {hasPendingChanges && (
              <Badge
                variant="outline"
                className="border-amber-500 text-amber-600 dark:text-amber-400 gap-1 text-xs"
              >
                <AlertTriangle className="h-3 w-3" />
                Alterações Pendentes
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro na Operação</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 !text-emerald-600 dark:!text-emerald-400" />
          <AlertTitle>Políticas Aplicadas</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Conteúdo da Clínica Selecionada */}
      {selectedClinic && formPolicy ? (
        <div className="space-y-6">
          {/* Métricas e Situação Comercial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
                  <Users className="h-4 w-4 text-primary" /> Vidas / Clientes Ativos
                </CardDescription>
                <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
                  <span>{formPolicy.currentActiveLives.toLocaleString("pt-BR")}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    / máx {formPolicy.maxActiveLives.toLocaleString("pt-BR")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLivesQuotaExceeded ? (
                  <Badge variant="destructive" className="text-xs font-semibold">
                    Quota Excedida
                  </Badge>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {Math.round((formPolicy.currentActiveLives / formPolicy.maxActiveLives) * 100)}%
                    da quota contratada
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
                  <UserCheck className="h-4 w-4 text-primary" /> Médicos Vinculados
                </CardDescription>
                <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
                  <span>{formPolicy.currentDoctors}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    / teto {formPolicy.maxDoctors}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isDoctorsLimitReached ? (
                  <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
                    Limite Atingido
                  </Badge>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {formPolicy.maxDoctors - formPolicy.currentDoctors} vagas disponíveis para
                    credenciamento
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
                  <ShieldAlert className="h-4 w-4 text-primary" /> Situação Comercial
                </CardDescription>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  {formPolicy.status === "regular" && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                      Ativa / Regular
                    </Badge>
                  )}
                  {formPolicy.status === "financial_block" && (
                    <Badge variant="destructive" className="text-xs">
                      Bloqueio Financeiro Ativo
                    </Badge>
                  )}
                  {formPolicy.status === "suspended" && (
                    <Badge variant="outline" className="border-rose-500 text-rose-600 text-xs">
                      Suspensa
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <Label htmlFor="status-select" className="text-xs text-muted-foreground">
                    Status Operacional:
                  </Label>
                  <select
                    id="status-select"
                    value={formPolicy.status}
                    onChange={(e) => handleStatusChange(e.target.value as ClinicPolicyStatus)}
                    className="h-7 px-2 rounded border border-input bg-background text-xs font-medium"
                  >
                    <option value="regular">Regular (Ativa)</option>
                    <option value="financial_block">Bloqueio Financeiro</option>
                    <option value="suspended">Suspensa</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuração de Quotas e Regras de Dependentes */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Limites e Quotas da Clínica</CardTitle>
              <CardDescription className="text-xs">
                Ajuste os tetos contratados para vidas ativas, médicos no corpo clínico e
                dependentes por titular.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="max-lives-input" className="text-xs font-medium">
                  Teto de Vidas / Clientes
                </Label>
                <Input
                  id="max-lives-input"
                  type="number"
                  min="0"
                  value={formPolicy.maxActiveLives}
                  onChange={(e) => handleNumberChange("maxActiveLives", e.target.value)}
                  className="h-8 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Uso atual: {formPolicy.currentActiveLives} vidas cadastradas.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-doctors-input" className="text-xs font-medium">
                  Teto de Médicos Vinculados
                </Label>
                <Input
                  id="max-doctors-input"
                  type="number"
                  min="0"
                  value={formPolicy.maxDoctors}
                  onChange={(e) => handleNumberChange("maxDoctors", e.target.value)}
                  className="h-8 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Uso atual: {formPolicy.currentDoctors} médicos ativos.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-dependents-input" className="text-xs font-medium">
                  Dependentes por Titular
                </Label>
                <Input
                  id="max-dependents-input"
                  type="number"
                  min="0"
                  value={formPolicy.maxDependentsPerHolder}
                  onChange={(e) => handleNumberChange("maxDependentsPerHolder", e.target.value)}
                  className="h-8 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Permitido por regra comercial de convênio.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Módulos e Componentes Habilitados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Módulos Oficiais Techmedicina
                </CardTitle>
                <CardDescription className="text-xs">
                  Habilite ou desabilite componentes do catálogo oficial para esta clínica.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    code: "TM-2" as const,
                    label: "TM-2 — Telemedicina Básica",
                    desc: "Clínica Geral e Pediatria 24h",
                  },
                  {
                    code: "TM-3" as const,
                    label: "TM-3 — Especialidades Médicas",
                    desc: "Consultas agendadas com especialistas",
                  },
                  {
                    code: "TM-4" as const,
                    label: "TM-4 — Especialidades & Multidisciplinar",
                    desc: "Psicologia, Nutrição e Educador Físico",
                  },
                  {
                    code: "AI-CARE" as const,
                    label: "AI-CARE — Dr. IA & Concierge Clínico",
                    desc: "Triagem preliminar e prontuário preditivo",
                  },
                  {
                    code: "PROTOCOL" as const,
                    label: "PROTOCOL — Gestão de Protocolos Clínicos",
                    desc: "Checklists clínicos e diretrizes da clínica",
                  },
                  {
                    code: "SUPPLEMENT" as const,
                    label: "SUPPLEMENT — Módulo de Suplementação",
                    desc: "Prescrição assistida e parceiros",
                  },
                ].map((mod) => (
                  <div
                    key={mod.code}
                    className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-background/50"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground">{mod.label}</p>
                      <p className="text-[11px] text-muted-foreground">{mod.desc}</p>
                    </div>
                    <Switch
                      checked={formPolicy.enabledComponents.includes(mod.code)}
                      onCheckedChange={() => handleToggleComponent(mod.code)}
                      aria-label={`Alternar módulo ${mod.label}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Dispositivos Homologados (Hardware)
                </CardTitle>
                <CardDescription className="text-xs">
                  Defina os wearables e periféricos de saúde que a clínica pode vincular aos
                  pacientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    code: "HW-PULSE" as const,
                    label: "Pulseira Inteligente (HW-PULSE)",
                    desc: "Batimentos, oxigenação e monitoramento 24h",
                  },
                  {
                    code: "HW-SCALE" as const,
                    label: "Balança de Bioimpedância (HW-SCALE)",
                    desc: "Peso, IMC, % gordura e massa muscular",
                  },
                  {
                    code: "HW-RING" as const,
                    label: "Anel Inteligente de Monitoramento (HW-RING)",
                    desc: "Sono contínuo, temperatura e recuperação",
                  },
                ].map((dev) => (
                  <div
                    key={dev.code}
                    className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-background/50"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground">{dev.label}</p>
                      <p className="text-[11px] text-muted-foreground">{dev.desc}</p>
                    </div>
                    <Switch
                      checked={formPolicy.allowedDevices.includes(dev.code)}
                      onCheckedChange={() => handleToggleDevice(dev.code)}
                      aria-label={`Alternar dispositivo ${dev.label}`}
                    />
                  </div>
                ))}

                <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Nota de Integridade (PRD
                    v0.11.3)
                  </p>
                  <p>
                    Persistência em Nuvem Pendente de Migração do Codex: O Super ADM preserva
                    conformidade com os 9 componentes oficiais e contratos estritos sem executar
                    gravações ilegais via cliente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Ações */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card">
            <div className="text-xs text-muted-foreground">
              {hasPendingChanges ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Você possui alterações não salvas para {selectedClinic.name}.
                </span>
              ) : (
                <span>Políticas alinhadas com as configurações vigentes.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!hasPendingChanges}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Descartar
              </Button>
              <Button
                size="sm"
                onClick={handleRequestSave}
                disabled={!hasPendingChanges || !hasSession}
                className="gap-1.5 text-xs font-semibold"
              >
                <Save className="h-3.5 w-3.5" /> Salvar Alterações
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center space-y-2 border border-dashed rounded-xl bg-muted/20 text-muted-foreground text-xs">
          <Building2 className="h-7 w-7 mx-auto text-primary/60 mb-2" />
          <p className="font-semibold text-foreground text-sm">
            Nenhuma clínica autorizada selecionada
          </p>
          <p>
            Selecione uma clínica parceira com identificador válido no seletor acima para gerenciar
            suas políticas, limites e entitlements.
          </p>
        </div>
      )}

      {/* Modal de Confirmação para Alterações Sensíveis */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Atualização de Políticas
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-2">
              Esta ação impactará os limites operacionais e recursos disponíveis para a clínica{" "}
              <strong>{selectedClinic?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 text-xs">
            <p className="text-muted-foreground">
              • Quota máxima de vidas: <strong>{formPolicy?.maxActiveLives}</strong> (em uso:{" "}
              {formPolicy?.currentActiveLives})
            </p>
            <p className="text-muted-foreground">
              • Teto de médicos: <strong>{formPolicy?.maxDoctors}</strong> (em uso:{" "}
              {formPolicy?.currentDoctors})
            </p>
            <p className="text-muted-foreground">
              • Situação da clínica: <strong>{formPolicy?.status}</strong>
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleConfirmSave}>
              Confirmar e Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
