import { describe, expect, it, vi } from "vitest";
import {
  createClinicDirectory,
  createClinicDirectoryResponse,
} from "../lib/admin/clinic-directory.server";
import { AuthError } from "../lib/auth/guards.server";
import { summarizeAccess } from "../lib/auth/access-summary";
import type { AuthenticatedIdentity } from "../lib/auth/core";

const row = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Clínica real",
  is_active: false,
  created_at: "2026-10-10T12:00:00+00:00",
};
const operator: AuthenticatedIdentity = {
  userId: "operator",
  globalRole: "super_admin",
  links: [],
};

describe("Cadastro administrativo protegido", () => {
  it.each([401, 403, 503])("resposta %s não usa cache nem expõe erro interno", async (status) => {
    const response = await createClinicDirectoryResponse(async () => {
      throw status === 503
        ? new Error("database secret details")
        : new AuthError("private details", status);
    })();
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).not.toMatch(/private details|secret details/);
  });
  it("recusa anônimo antes de consultar dados", async () => {
    const read = vi.fn();
    await expect(createClinicDirectory(async () => null, read)()).rejects.toMatchObject({
      status: 401,
    });
    expect(read).not.toHaveBeenCalled();
  });
  it.each(["admin", "medico", "paciente"] as const)(
    "%s não ganha visão global por grant local",
    async (role) => {
      const read = vi.fn();
      const identity: AuthenticatedIdentity = {
        userId: "local",
        links: [
          {
            clinicId: "A",
            role,
            isActive: true,
            grants: [{ resource: "cadastro_clinica", action: "read" }],
          },
        ],
      };
      await expect(createClinicDirectory(async () => ({ identity }), read)()).rejects.toMatchObject(
        { status: 403 },
      );
      expect(read).not.toHaveBeenCalled();
    },
  );
  it("conta autenticada sem vínculo não recebe cadastro", async () => {
    const read = vi.fn();
    await expect(
      createClinicDirectory(async () => ({ identity: { userId: "account", links: [] } }), read)(),
    ).rejects.toMatchObject({ status: 403 });
    expect(read).not.toHaveBeenCalled();
  });
  it("operador persistido consulta cadastro, incluindo clínica inativa", async () => {
    const context = { identity: operator };
    const read = vi.fn().mockResolvedValue([row]);
    expect(await createClinicDirectory(async () => context, read)()).toEqual({
      clinics: [row],
      hasMore: false,
    });
    expect(read).toHaveBeenCalledWith(context);
  });
  it("retorna banco vazio sem gerar clínicas demonstrativas", async () => {
    expect(
      await createClinicDirectory(
        async () => ({ identity: operator }),
        async () => [],
      )(),
    ).toEqual({ clinics: [], hasMore: false });
  });
  it("limita resultado e informa que há mais clínicas", async () => {
    const result = await createClinicDirectory(
      async () => ({ identity: operator }),
      async () => Array.from({ length: 101 }, () => row),
    )();
    expect(result.clinics).toHaveLength(100);
    expect(result.hasMore).toBe(true);
  });
  it("recusa resposta com campos sensíveis ou formato inesperado", async () => {
    await expect(
      createClinicDirectory(
        async () => ({ identity: operator }),
        async () => [{ ...row, medical_record: "never expose" }],
      )(),
    ).rejects.toThrow();
  });
  it("resumo não expõe usuário, patientId ou grants e ignora vínculos inativos", () => {
    const identity: AuthenticatedIdentity = {
      ...operator,
      links: [
        { clinicId: "A", role: "paciente", patientId: "private", isActive: false, grants: [] },
      ],
    };
    expect(summarizeAccess(identity)).toEqual({ platformAdmin: true, clinicCount: 0 });
  });
});
