import { describe, it, expect } from "vitest";
import { getSession, requireAuth, createGuardFactory, AuthError } from "../lib/auth/guards.server";
import { AuthenticatedIdentity } from "../lib/auth/core";

describe("Guards de Servidor (Unitário)", () => {
  it("requisição sem sessão lança erro 401 Unauthorized", async () => {
    // getSession() deve retornar null (negado por padrão)
    const session = await getSession();
    expect(session).toBeNull();

    // Tentar exigir auth deve lançar erro
    await expect(requireAuth()).rejects.toThrow(AuthError);
    await expect(requireAuth()).rejects.toThrow(/401: Unauthorized - Missing session/);
  });

  it("requirePermission lança erro de falta de sessão antes de verificar permissão", async () => {
    const guards = createGuardFactory(
      async () => null,
      async () => undefined,
    );
    await expect(guards.requirePermission("cadastro_clinica", "read")).rejects.toThrow(
      /401: Unauthorized - Missing session/,
    );
  });

  it("lança erro 403 Forbidden se identidade não tiver grants", async () => {
    // Fábrica com resolvedor simulado fornecendo identidade válida sem links (sem permissão)
    const fakeSession: AuthenticatedIdentity = { userId: "user", links: [] };
    const guards = createGuardFactory(
      async () => fakeSession,
      async () => undefined,
    );

    // Deve ser bloqueado com 403 por falta de grants
    await expect(guards.requirePermission("paciente", "read")).rejects.toThrow(AuthError);
    await expect(guards.requirePermission("paciente", "read")).rejects.toThrow(
      /403: Forbidden - Action 'read' on resource 'paciente' denied/,
    );
  });
});
