import { z } from "zod";

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

// ============================================================================
// COMPONENTES OFICIAIS DO CATÁLOGO COMERCIAL (PRD v0.11.3 - Seção 1.1 / 13)
// ============================================================================

export type CatalogComponentCode =
  | "TM-2"
  | "TM-3"
  | "TM-4"
  | "HW-PULSE"
  | "HW-SCALE"
  | "HW-RING"
  | "AI-CARE"
  | "PROTOCOL"
  | "SUPPLEMENT";

export interface CatalogComponent {
  code: CatalogComponentCode;
  name: string;
  category: "telemedicine" | "device" | "ai" | "protocol" | "store";
  description: string;
  includedFeatures: string[];
  status: "active" | "draft" | "pending_review";
  notes?: string | undefined;
}

export const CATALOG_COMPONENTS: readonly CatalogComponent[] = [
  {
    code: "TM-2",
    name: "Telemedicina 2.0",
    category: "telemedicine",
    description: "Pronto atendimento online 24h com clínico geral e pediatria sob demanda.",
    includedFeatures: [
      "Pronto atendimento clínico geral 24h",
      "Triagem médica preliminar",
      "Receituário digital e atestados conforme avaliação médica",
    ],
    status: "active",
    notes: "Distinguir atendimento 24h de consultas agendadas; elegibilidade contratual.",
  },
  {
    code: "TM-3",
    name: "Telemedicina 3.0",
    category: "telemedicine",
    description:
      "Pronto atendimento 24h mais consultas agendadas em até 32 especialidades médicas.",
    includedFeatures: [
      "Todos os recursos da Telemedicina 2.0",
      "Agendamento de consultas com especialistas",
      "Acesso ao catálogo de especialidades contratadas",
      "Retorno médico vinculado ao prontuário",
    ],
    status: "active",
    notes: "Relação exata das 32 especialidades e limites contratuais sujeitos a catálogo.",
  },
  {
    code: "TM-4",
    name: "Telemedicina 4.0",
    category: "telemedicine",
    description:
      "Concierge para agendamento assistido de atendimento presencial e suporte executivo.",
    includedFeatures: [
      "Agendamento assistido presencial",
      "Concierge de saúde dedicado",
      "Carência inicial padrão de 90 dias e fidelidade de 12 meses",
    ],
    status: "draft",
    notes: "Parâmetros comerciais iniciais em homologação de rede presencial.",
  },
  {
    code: "HW-PULSE",
    name: "Pulseira Inteligente",
    category: "device",
    description: "Dispositivo vestível para monitoramento de sinais vitais, frequência e passos.",
    includedFeatures: [
      "Leitura de passos e atividade física",
      "Monitoramento de frequência cardíaca",
      "Integração com o aplicativo do paciente",
    ],
    status: "active",
    notes: "Apenas dispositivos cadastrados e liberados pelo Super ADM acessam a plataforma.",
  },
  {
    code: "HW-SCALE",
    name: "Balança de Bioimpedância",
    category: "device",
    description: "Balança inteligente para coleta de composição corporal e histórico ponderal.",
    includedFeatures: [
      "Registro de peso e massa magra",
      "Sincronização com perfil do paciente",
      "Histórico de evolução física",
    ],
    status: "draft",
    notes: "Integração técnica e métricas dependem do modelo e validação BLE/API.",
  },
  {
    code: "HW-RING",
    name: "Anel Inteligente",
    category: "device",
    description: "Dispositivo anelar para monitoramento de sono e temperatura corporal.",
    includedFeatures: [
      "Monitoramento de estágios do sono",
      "Tendência térmica e variabilidade cardíaca",
    ],
    status: "draft",
    notes: "Integração dependente de homologação técnica de hardware e modelo.",
  },
  {
    code: "AI-CARE",
    name: "Assistente de Saúde IA (Dr. IA)",
    category: "ai",
    description: "Assistente virtual proativa com identidade White Label configurável por clínica.",
    includedFeatures: [
      "Acompanhamento preventivo de hábitos",
      "Lembretes e mensagens personalizadas no canal autorizado",
      "Encaminhamento para equipe médica em sinais de atenção",
    ],
    status: "active",
    notes: "A IA sempre se identifica como assistente virtual e nunca emite diagnóstico.",
  },
  {
    code: "PROTOCOL",
    name: "Protocolos de Acompanhamento",
    category: "protocol",
    description: "Planos clínicos estruturados por patologia ou objetivo assistencial com etapas.",
    includedFeatures: [
      "Definição de metas e tarefas pelo médico",
      "Acompanhamento de adesão pelo paciente",
      "Registro integrado ao prontuário da clínica",
    ],
    status: "active",
    notes: "Configuração clínica pelo médico; Super ADM apenas habilita a funcionalidade.",
  },
  {
    code: "SUPPLEMENT",
    name: "Suplementos e Produtos",
    category: "store",
    description:
      "Disponibilização de loja própria da clínica para suplementos e itens homologados.",
    includedFeatures: [
      "Catálogo de itens autorizados pelo Super ADM",
      "Configuração de margem comercial pela clínica",
      "Trilha de pedidos e integração logística",
    ],
    status: "draft",
    notes: "Itens sujeitos à conformidade regulatória e liberação central da PlugPix.",
  },
] as const;

// ============================================================================
// POLÍTICAS COMERCIAIS E LIMITES POR CLÍNICA (PRD Seção 1.2, 12 e 14)
// ============================================================================

export type ClinicPolicyStatus = "regular" | "financial_block" | "suspended";

export interface ClinicPolicyConfig {
  clinicId: string;
  enabledComponents: CatalogComponentCode[];
  maxActiveLives: number;
  currentActiveLives: number;
  maxDoctors: number;
  currentDoctors: number;
  maxDependentsPerHolder: number;
  allowedDevices: Array<"HW-PULSE" | "HW-SCALE" | "HW-RING">;
  specialtiesAvailable: string[];
  status: ClinicPolicyStatus;
  financialBlockReason?: string | null;
  updatedAt: string;
}

export function isValidClinicUuid(id: unknown): id is string {
  return typeof id === "string" && z.string().uuid().safeParse(id).success;
}

export const DEFAULT_CLINIC_POLICY = (clinicId: string): ClinicPolicyConfig => ({
  clinicId,
  enabledComponents: ["TM-2", "AI-CARE", "PROTOCOL"],
  maxActiveLives: 500,
  currentActiveLives: 0,
  maxDoctors: 15,
  currentDoctors: 0,
  maxDependentsPerHolder: 3,
  allowedDevices: ["HW-PULSE"],
  specialtiesAvailable: [
    "Clínica Geral",
    "Cardiologia",
    "Dermatologia",
    "Ginecologia",
    "Pediatria",
    "Ortopedia",
  ],
  status: "regular",
  financialBlockReason: null,
  updatedAt: new Date().toISOString(),
});
