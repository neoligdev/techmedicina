import {
  PlanBase,
  PlansSchema,
  ServiceConditions,
  TelemedicinePlanBase,
  BraceletPlanBase,
  GetPlansResult,
  SavePlansResult,
} from "./types";

const STORAGE_KEY = "techmedicina_plans_catalog";

function validateNumber(val: unknown): number | null {
  if (val === null) return null;
  if (typeof val === "number" && Number.isFinite(val) && val >= 0) return val;
  throw new Error("Campo numérico inválido (deve ser finito >= 0 ou nulo)");
}

function validateBoolean(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  throw new Error("Campo booleano inválido (deve ser estritamente booleano)");
}

function validateService(val: unknown): ServiceConditions {
  if (!val || typeof val !== "object") throw new Error("Serviço inválido");
  const obj = val as Record<string, unknown>;
  return {
    enabled: validateBoolean(obj["enabled"]),
    coparticipacao: validateNumber(obj["coparticipacao"]),
    carencia: validateNumber(obj["carencia"]),
    fidelidade: validateNumber(obj["fidelidade"]),
  };
}

function validatePlan(plan: unknown): PlanBase {
  if (!plan || typeof plan !== "object") throw new Error("Plano inválido (não é objeto)");
  const obj = plan as Record<string, unknown>;

  const id = obj["id"];
  if (typeof id !== "string" || !id.trim() || id.length > 50) throw new Error("ID inválido");

  const name = obj["name"];
  if (typeof name !== "string" || !name.trim() || name.length > 120)
    throw new Error("Nome inválido ou longo demais (>120)");

  const createdAt = obj["createdAt"];
  if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt)))
    throw new Error("Data de criação inválida");

  const status = obj["status"];
  if (status !== "draft" && status !== "active") {
    throw new Error(`Status desconhecido ou ausente: ${String(status)}`);
  }

  const type = obj["type"];
  if (type === "telemedicine") {
    const agendadoVal = obj["prontoAtendimentoAgendado"];
    const agendado =
      agendadoVal !== undefined
        ? validateService(agendadoVal)
        : { enabled: false, coparticipacao: null, carencia: null, fidelidade: null };

    return {
      id,
      type: "telemedicine",
      name,
      status: "draft", // Sempre força para draft
      createdAt,
      prontoAtendimento24h: validateService(obj["prontoAtendimento24h"]),
      prontoAtendimentoAgendado: agendado,
      especialidadesMedicas: validateService(obj["especialidadesMedicas"]),
      nutricao: validateService(obj["nutricao"]),
      psicologia: validateService(obj["psicologia"]),
      educadorFisico: validateService(obj["educadorFisico"]),
      conciergePresencial: validateService(obj["conciergePresencial"]),
    };
  } else if (type === "bracelet") {
    return {
      id,
      type: "bracelet",
      name,
      status: "draft", // Sempre força para draft
      createdAt,
      precoAtivacao: validateNumber(obj["precoAtivacao"]),
      precoMensalidade: validateNumber(obj["precoMensalidade"]),
      comMedico: validateBoolean(obj["comMedico"]),
      comIA: validateBoolean(obj["comIA"]),
      comFidelidade: validateBoolean(obj["comFidelidade"]),
    };
  }

  throw new Error("Tipo de plano inválido");
}

export const getPlans = (): GetPlansResult => {
  if (typeof window === "undefined") return { plans: [], recoveryNeeded: false };
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { plans: [], recoveryNeeded: false };

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch (err) {
      return {
        plans: [],
        error: "O arquivo salvo contém formato JSON corrompido.",
        recoveryNeeded: true,
        rawContent: data,
      };
    }

    if (!parsed || typeof parsed !== "object") {
      return {
        plans: [],
        error: "O arquivo salvo não contém um objeto válido.",
        recoveryNeeded: true,
        rawContent: data,
      };
    }

    const obj = parsed as Record<string, unknown>;
    if (obj["version"] !== 1) {
      return {
        plans: [],
        error: "Versão de dados não suportada.",
        recoveryNeeded: true,
        rawContent: data,
      };
    }

    const plansArr = obj["plans"];
    if (!Array.isArray(plansArr)) {
      return {
        plans: [],
        error: "Os planos salvos não estão em formato de lista.",
        recoveryNeeded: true,
        rawContent: data,
      };
    }

    const validPlans: PlanBase[] = [];
    const seenIds = new Set<string>();
    let hasInvalid = false;
    let hasLegacy = false;

    for (const plan of plansArr) {
      try {
        const p = plan as Record<string, unknown>;
        if (p && p["status"] === "active") hasLegacy = true;

        const validPlan = validatePlan(plan);
        if (seenIds.has(validPlan.id)) throw new Error("ID duplicado");
        seenIds.add(validPlan.id);
        validPlans.push(validPlan);
      } catch (err) {
        hasInvalid = true;
      }
    }

    let warning;
    if (hasInvalid) {
      return {
        plans: validPlans,
        error:
          "Alguns planos estão corrompidos ou possuem IDs duplicados. A gravação foi bloqueada para evitar a perda dos dados inválidos.",
        recoveryNeeded: true,
        rawContent: data,
      };
    }

    if (hasLegacy) {
      warning =
        "Alguns planos possuíam o status legado 'Ativo' e foram migrados para 'Rascunho' com sucesso.";
    }

    return { plans: validPlans, warning, recoveryNeeded: false, rawContent: data };
  } catch (error) {
    // If getItem throws, we have no data, we should not trigger recovery. Just return an error to retry.
    return {
      plans: [],
      error: "Falha crítica de acesso aos dados do navegador. Tente novamente.",
      recoveryNeeded: false,
      readFailed: true,
    };
  }
};

export const backupAndClearPlans = (
  expectedRawContent: string,
  validPlans: PlanBase[],
): SavePlansResult & { backupKey?: string } => {
  if (typeof window === "undefined") return { success: false, error: "Ambiente server-side." };
  try {
    const currentData = localStorage.getItem(STORAGE_KEY);
    if (currentData !== expectedRawContent) {
      return {
        success: false,
        error: "Os dados foram modificados em outra aba. Recarregue a página antes de continuar.",
      };
    }

    const backupKey = `${STORAGE_KEY}_backup_${Date.now()}`;
    localStorage.setItem(backupKey, expectedRawContent);

    const saveResult = savePlans(validPlans);
    if (!saveResult.success) {
      return {
        success: false,
        error: `Backup realizado (${backupKey}), mas falha ao salvar dados válidos: ${saveResult.error}`,
      };
    }

    return { success: true, backupKey };
  } catch (err) {
    return {
      success: false,
      error:
        "Falha ao criar backup dos dados corrompidos. A recuperação foi abortada por segurança.",
    };
  }
};

export const savePlans = (plans: PlanBase[]): SavePlansResult => {
  if (typeof window === "undefined") return { success: false, error: "Ambiente server-side." };

  try {
    const seenIds = new Set<string>();
    for (const p of plans) {
      if (seenIds.has(p.id)) {
        return { success: false, error: `ID de plano duplicado encontrado: ${p.id}` };
      }
      seenIds.add(p.id);
    }

    const validPlans = plans.map(validatePlan);
    const schema: PlansSchema = {
      version: 1,
      plans: validPlans,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido de storage.",
    };
  }
};
