export type PlanType = "telemedicine" | "bracelet";
export type PlanStatus = "draft";

export interface ServiceConditions {
  enabled: boolean;
  coparticipacao: number | null;
  carencia: number | null;
  fidelidade: number | null;
}

export interface TelemedicinePlanBase {
  id: string;
  type: "telemedicine";
  name: string;
  status: PlanStatus;
  createdAt: string;

  // Serviços
  prontoAtendimento24h: ServiceConditions;
  prontoAtendimentoAgendado: ServiceConditions;
  especialidadesMedicas: ServiceConditions;
  nutricao: ServiceConditions;
  psicologia: ServiceConditions;
  educadorFisico: ServiceConditions;
  conciergePresencial: ServiceConditions;
}

export interface BraceletPlanBase {
  id: string;
  type: "bracelet";
  name: string;
  status: PlanStatus;
  createdAt: string;

  precoAtivacao: number | null;
  precoMensalidade: number | null;
  comMedico: boolean;
  comIA: boolean;
  comFidelidade: boolean;
}

export type PlanBase = TelemedicinePlanBase | BraceletPlanBase;

export interface PlansSchema {
  version: 1;
  plans: PlanBase[];
}

export interface GetPlansResult {
  plans: PlanBase[];
  error?: string | undefined;
  warning?: string | undefined;
  recoveryNeeded: boolean;
  readFailed?: boolean | undefined;
  rawContent?: string | undefined;
}

export interface SavePlansResult {
  success: boolean;
  error?: string | undefined;
}

export const createDefaultServiceConditions = (): ServiceConditions => ({
  enabled: false,
  coparticipacao: null,
  carencia: null,
  fidelidade: null,
});
