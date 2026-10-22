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
    name: "Pulseira Inteligente (H59 / H59MAX)",
    category: "device",
    description:
      "Dispositivo vestível (referência técnica H59 / H59MAX) para telemetria de atividade física e frequência cardíaca.",
    includedFeatures: [
      "Leitura de passos e atividade física",
      "Monitoramento de frequência cardíaca",
      "Integração planejada com aplicativo do paciente via BLE",
    ],
    status: "active",
    notes:
      "Modelo H59/H59MAX sob investigação de protocolo BLE/GATT (PRD Seção 6.3/13.3). Nenhum dispositivo é de inclusão obrigatória por presunção comercial; integração física e pareamento dependem de homologação.",
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
    notes:
      "Integração técnica e métricas dependem do modelo e validação BLE/API. Equipamento modular e opcional para planos com foco metabólico.",
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
    notes:
      "Integração dependente de homologação técnica de hardware e modelo. Equipamento opcional para planos de longevidade.",
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

// ============================================================================
// PACOTES DE REFERÊNCIA / MODELOS CENTRAIS (PRD Adendo §1 e Seção 13.4)
// ============================================================================

export interface ReferencePackage {
  id: string;
  name: string;
  tier: "essential" | "advanced" | "prime";
  tierLabel: string;
  description: string;
  components: CatalogComponentCode[];
  pricingModel: {
    setupFeeEstimated: number | null;
    monthlyBaseFee: number | null;
    perLifeFee: number | null;
    currency: "BRL";
    pricingNote: string;
  };
  rulesSummary: string[];
  status: "active" | "draft";
}

export const REFERENCE_PACKAGES: readonly ReferencePackage[] = [
  {
    id: "pkg-essential-2-0",
    name: "Plano Essencial Vida (2.0)",
    tier: "essential",
    tierLabel: "Nível 1 — Essencial",
    description:
      "Modelo de referência para pronto atendimento online 24h, Dr. IA para hábitos e monitoramento via Pulseira Inteligente (H59/H59MAX).",
    components: ["TM-2", "AI-CARE", "HW-PULSE"],
    pricingModel: {
      setupFeeEstimated: null,
      monthlyBaseFee: null,
      perLifeFee: null,
      currency: "BRL",
      pricingNote:
        "Valores sob consulta — parametrizados pela clínica parceira no contrato individual.",
    },
    rulesSummary: [
      "Pronto atendimento clínico geral e pediatria 24h sem carência",
      "Monitoramento de passos e frequência cardíaca via pulseira (dispositivo modular opcional)",
      "Dr. IA em modo assistente preventivo (triagem e hábitos saudáveis)",
    ],
    status: "active",
  },
  {
    id: "pkg-integral-3-0",
    name: "Plano Integral Especialidades (3.0)",
    tier: "advanced",
    tierLabel: "Nível 2 — Avançado",
    description:
      "Modelo abrangente com PA 24h, agendamento em até 32 especialidades médicas, bioimpedância e acompanhamento clínico com protocolos.",
    components: ["TM-2", "TM-3", "AI-CARE", "PROTOCOL", "HW-PULSE", "HW-SCALE"],
    pricingModel: {
      setupFeeEstimated: null,
      monthlyBaseFee: null,
      perLifeFee: null,
      currency: "BRL",
      pricingNote:
        "Valores sob consulta — parametrizados pela clínica parceira no contrato individual.",
    },
    rulesSummary: [
      "PA 24h + consultas agendadas com especialistas médicos do catálogo contratado",
      "Balança de bioimpedância para composição corporal (hardware opcional)",
      "Protocolos médicos estruturados vinculados ao prontuário",
      "Gamificação na JORNADA e Escudos de Proteção",
    ],
    status: "active",
  },
  {
    id: "pkg-prime-4-0",
    name: "Plano Prime Concierge & Longevidade (4.0)",
    tier: "prime",
    tierLabel: "Nível 3 — Prime",
    description:
      "Modelo premium para clínicas de alta performance com concierge presencial, anel inteligente, Dr. IA e suplementação personalizada.",
    components: [
      "TM-2",
      "TM-3",
      "TM-4",
      "AI-CARE",
      "PROTOCOL",
      "SUPPLEMENT",
      "HW-PULSE",
      "HW-RING",
    ],
    pricingModel: {
      setupFeeEstimated: null,
      monthlyBaseFee: null,
      perLifeFee: null,
      currency: "BRL",
      pricingNote:
        "Valores sob consulta — parametrizados pela clínica parceira no contrato individual.",
    },
    rulesSummary: [
      "Concierge dedicado para atendimento presencial (parâmetros iniciais: carência 90d e fidelidade 12m)",
      "Quantidade anual de consultas presenciais '3, 4 ou 4' pendente de homologação pelo proprietário",
      "Anel inteligente e suplementação como recursos modulares opcionais",
      "Acesso completo ao ecossistema preventivo e Dr. IA proativo",
    ],
    status: "draft",
  },
] as const;

// ============================================================================
// CONTRATO DA CLÍNICA COM A PLUGPIX (PRD Seção 13.1 — Camada 1)
// ============================================================================

export interface ClinicContractTerms {
  contractPlanName: string;
  setupFee: number | null;
  hasMonthlyFee: boolean;
  monthlyFee: number | null;
  hasLivesBilling: boolean;
  contractedLives: number;
  pricePerHolderLife: number | null;
  pricePerDependentLife: number | null;
  billingCycle: "monthly" | "annual";
  contractStartedAt: string;
  contractExpiresAt?: string | null;
}

// ============================================================================
// REGRAS DE UTILIZAÇÃO E FRANQUIAS (PRD Seção 13.2, 13.3 e 14)
// ============================================================================

export interface ClinicUsageRules {
  telemed24hAllowance: "unlimited" | "monthly_quota";
  telemed24hQuotaPerMonth?: number;
  specialtyAppointmentsQuotaPerMonth: number;
  drIaAccessLevel: "full" | "vital_signs_only" | "disabled";
  allowDependents: boolean;
  trackingFeatures: Array<"journey" | "shields" | "protocols">;
}

export const SPECIALTIES_GOVERNANCE_NOTE =
  "O PRD (Seção 13.2 e TM-3) prevê até 32 especialidades médicas agendadas mais 3 áreas multidisciplinares independentes (Nutrição, Psicologia e Educador Físico, totalizando 35 áreas no escopo amplo). A relação nominal exata e fechada das 32 especialidades médicas permanece pendente de consolidação oficial pelo proprietário.";

export const ALL_SPECIALTIES = [
  "Clínica Geral",
  "Pediatria",
  "Cardiologia",
  "Dermatologia",
  "Ginecologia e Obstetrícia",
  "Ortopedia e Traumatologia",
  "Neurologia",
  "Endocrinologia e Metabologia",
  "Psiquiatria",
  "Oftalmologia",
  "Otorrinolaringologia",
  "Urologia",
  "Gastroenterologia",
  "Pneumologia",
  "Nutrologia",
  "Reumatologia",
  "Infectologia",
  "Geriatria",
] as const;

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
  contractTerms?: ClinicContractTerms;
  usageRules?: ClinicUsageRules;
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
    "Ginecologia e Obstetrícia",
    "Pediatria",
    "Ortopedia e Traumatologia",
  ],
  status: "regular",
  financialBlockReason: null,
  contractTerms: {
    contractPlanName: "Plano White Label Standard — PlugPix",
    setupFee: null,
    hasMonthlyFee: true,
    monthlyFee: null,
    hasLivesBilling: true,
    contractedLives: 500,
    pricePerHolderLife: null,
    pricePerDependentLife: null,
    billingCycle: "monthly",
    contractStartedAt: "2026-01-01T00:00:00.000Z",
    contractExpiresAt: "2027-01-01T00:00:00.000Z",
  },
  usageRules: {
    telemed24hAllowance: "unlimited",
    specialtyAppointmentsQuotaPerMonth: 2,
    drIaAccessLevel: "full",
    allowDependents: true,
    trackingFeatures: ["journey", "shields", "protocols"],
  },
  updatedAt: new Date().toISOString(),
});
