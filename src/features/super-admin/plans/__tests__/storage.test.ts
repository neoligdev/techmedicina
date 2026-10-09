import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getPlans, savePlans } from "../storage";
import {
  TelemedicinePlanBase,
  BraceletPlanBase,
  createDefaultServiceConditions,
  PlanBase,
} from "../types";

const STORAGE_KEY = "techmedicina_plans_catalog";

describe("Plans Storage and Validation (C005-R1)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getPlans Validation", () => {
    it("returns empty array when local storage is empty", () => {
      expect(getPlans().plans).toEqual([]);
      expect(getPlans().recoveryNeeded).toBe(false);
    });

    it("returns recoveryNeeded on malformed JSON", () => {
      localStorage.setItem(STORAGE_KEY, "{ malformed json");
      const res = getPlans();
      expect(res.plans).toEqual([]);
      expect(res.recoveryNeeded).toBe(true);
      expect(res.error).toBeDefined();
    });

    it("returns recoveryNeeded if plans is not an array", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, plans: "not an array" }));
      const res = getPlans();
      expect(res.plans).toEqual([]);
      expect(res.recoveryNeeded).toBe(true);
      expect(res.error).toBeDefined();
    });

    it("ignores plans with missing or invalid basic fields and returns error and recoveryNeeded", () => {
      const invalidPlans = [
        { id: "1", type: "bracelet", name: "" }, // missing required fields
        { id: "2", type: "telemedicine", name: "Valid", status: "draft" }, // missing createdAt
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, plans: invalidPlans }));
      const res = getPlans();
      expect(res.plans).toEqual([]); // all ignored
      expect(res.error).toBeDefined();
      expect(res.recoveryNeeded).toBe(true);
    });

    it("forces status to draft even if active legacy data exists and warns", () => {
      const legacyPlan = {
        id: "leg-1",
        type: "bracelet",
        name: "Legacy Plan",
        status: "active",
        createdAt: new Date().toISOString(),
        precoAtivacao: 100,
        precoMensalidade: null,
        comMedico: false,
        comIA: false,
        comFidelidade: false,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, plans: [legacyPlan] }));

      const loaded = getPlans();
      expect(loaded.plans).toHaveLength(1);
      expect(loaded.plans[0]?.status).toBe("draft");
      expect(loaded.warning).toBeDefined();
    });

    it("rejects Infinity, NaN and strings in number fields", () => {
      const badNumberPlan = {
        id: "bad-1",
        type: "bracelet",
        name: "Bad Number Plan",
        status: "draft",
        createdAt: new Date().toISOString(),
        precoAtivacao: Infinity,
        precoMensalidade: "100", // string instead of number
        comMedico: false,
        comIA: false,
        comFidelidade: false,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, plans: [badNumberPlan] }));

      const loaded = getPlans();
      expect(loaded.plans).toHaveLength(0); // ignored due to validation
      expect(loaded.error).toBeDefined();
      expect(loaded.recoveryNeeded).toBe(true);
    });

    it("rejects non-boolean types in boolean fields", () => {
      const badBooleanPlan = {
        id: "bad-bool",
        type: "bracelet",
        name: "Bad Bool",
        status: "draft",
        createdAt: new Date().toISOString(),
        precoAtivacao: 10,
        precoMensalidade: 10,
        comMedico: "true", // string
        comIA: 1, // number
        comFidelidade: false,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, plans: [badBooleanPlan] }));

      const res = getPlans();
      expect(res.plans).toHaveLength(0);
      expect(res.error).toBeDefined();
      expect(res.recoveryNeeded).toBe(true);
    });

    it("rejects duplicate IDs", () => {
      const validPlan: BraceletPlanBase = {
        id: "dup-1",
        type: "bracelet",
        name: "Plan A",
        status: "draft",
        createdAt: new Date().toISOString(),
        precoAtivacao: null,
        precoMensalidade: null,
        comMedico: false,
        comIA: false,
        comFidelidade: false,
      };
      const dupPlan = { ...validPlan, name: "Plan B" };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, plans: [validPlan, dupPlan] }),
      );

      const loaded = getPlans();
      expect(loaded.plans).toHaveLength(1);
      expect(loaded.plans[0]?.name).toBe("Plan A");
      expect(loaded.error).toBeDefined();
      expect(loaded.recoveryNeeded).toBe(true);
    });

    it("correctly reads roundtrip of two different types", () => {
      const tmPlan: TelemedicinePlanBase = {
        id: "tm-1",
        type: "telemedicine",
        name: "TM Plan",
        status: "draft",
        createdAt: new Date().toISOString(),
        prontoAtendimento24h: {
          ...createDefaultServiceConditions(),
          enabled: true,
          coparticipacao: 10,
        },
        prontoAtendimentoAgendado: createDefaultServiceConditions(),
        especialidadesMedicas: createDefaultServiceConditions(),
        nutricao: createDefaultServiceConditions(),
        psicologia: createDefaultServiceConditions(),
        educadorFisico: createDefaultServiceConditions(),
        conciergePresencial: createDefaultServiceConditions(),
      };

      const brPlan: BraceletPlanBase = {
        id: "br-1",
        type: "bracelet",
        name: "BR Plan",
        status: "draft",
        createdAt: new Date().toISOString(),
        precoAtivacao: 50.5,
        precoMensalidade: 0,
        comMedico: true,
        comIA: false,
        comFidelidade: true,
      };

      savePlans([tmPlan, brPlan]);
      const loaded = getPlans();
      expect(loaded.plans).toHaveLength(2);
      expect(loaded.plans[0]).toEqual(tmPlan);
      expect(loaded.plans[1]).toEqual(brPlan);
      expect(loaded.warning).toBeUndefined();
      expect(loaded.error).toBeUndefined();
    });
  });

  describe("savePlans", () => {
    it("returns success: true when storage works", () => {
      const result = savePlans([]);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns success: false when setItem throws (quota exceeded/blocked)", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("Quota exceeded");
      });
      const result = savePlans([]);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Quota exceeded");
    });

    it("returns success: false when duplicate IDs are provided to savePlans", () => {
      const validPlan: BraceletPlanBase = {
        id: "dup-1",
        type: "bracelet",
        name: "Plan A",
        status: "draft",
        createdAt: new Date().toISOString(),
        precoAtivacao: null,
        precoMensalidade: null,
        comMedico: false,
        comIA: false,
        comFidelidade: false,
      };
      const result = savePlans([validPlan, validPlan]);
      expect(result.success).toBe(false);
      expect(result.error).toContain("duplicado");
    });

    it("returns success: false when invalid plan is provided", () => {
      // Trying to save an invalid plan manually casting
      const result = savePlans([{ id: "missing-everything" } as unknown as PlanBase]);
      expect(result.success).toBe(false);
      expect(result.error).toContain("inválido");
    });
  });
});
