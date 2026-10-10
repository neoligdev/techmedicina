import { describe, expect, it, vi } from "vitest";
import { createClinicBrandingHandlers } from "../lib/admin/clinic-branding.server";
import { AuthError } from "../lib/auth/guards.server";
import type { AuthenticatedIdentity, Role } from "../lib/auth/core";

const clinicId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const preferences = { name: "Clínica", primary: "#123456", secondary: "#abcdef", mode: "dark" };
const saved = { clinic_id: clinicId, preferences, revision: 1, updated_at: "2026-10-10T12:00:00Z" };
const operator: AuthenticatedIdentity = {
  userId: "operator",
  globalRole: "super_admin",
  links: [],
};
function local(role: Role, write = false): AuthenticatedIdentity {
  return {
    userId: "local",
    links: [
      {
        clinicId,
        role,
        isActive: true,
        patientId: "patient",
        grants: write ? [{ resource: "cadastro_clinica", action: "write" }] : [],
      },
    ],
  };
}
function request(
  body: unknown = { clinicId, preferences, expectedRevision: 0 },
  query = `clinicId=${clinicId}`,
) {
  return new Request(`https://example.test/api/branding?${query}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function setup(identity: AuthenticatedIdentity | null = operator) {
  const read = vi.fn().mockResolvedValue(saved);
  const write = vi.fn().mockResolvedValue(saved);
  return {
    read,
    write,
    handlers: createClinicBrandingHandlers(
      async () => (identity ? { identity } : null),
      read,
      write,
    ),
  };
}

describe("Fronteira HTTP da identidade visual", () => {
  it("nega anônimo antes de ler parâmetros ou dados", async () => {
    const { handlers, read, write } = setup(null);
    expect((await handlers.PUT(request({}, "invalid=1"))).status).toBe(401);
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it.each(["medico", "paciente"] as const)("%s com grant não pode gravar", async (role) => {
    const { handlers, write } = setup(local(role, true));
    expect((await handlers.PUT(request())).status).toBe(403);
    expect(write).not.toHaveBeenCalled();
  });
  it("exige grant explícito do administrador e clínica correspondente", async () => {
    expect((await setup(local("admin")).handlers.PUT(request())).status).toBe(403);
    const { handlers, write } = setup(local("admin", true));
    expect((await handlers.PUT(request())).status).toBe(200);
    expect(
      (
        await handlers.PUT(
          request({ clinicId: otherId, preferences, expectedRevision: 0 }, `clinicId=${otherId}`),
        )
      ).status,
    ).toBe(403);
    expect(write).toHaveBeenCalledTimes(1);
  });
  it.each(["admin", "medico", "paciente"] as const)(
    "%s lê somente identidade da sua clínica",
    async (role) => {
      const { handlers, read } = setup(local(role));
      expect((await handlers.GET(request())).status).toBe(200);
      expect((await handlers.GET(request({}, `clinicId=${otherId}`))).status).toBe(403);
      expect(read).toHaveBeenCalledTimes(1);
    },
  );
  it("recusa parâmetros duplicados, corpo de outra clínica e campos extras", async () => {
    const { handlers, write } = setup();
    for (const r of [
      request({}, `clinicId=${clinicId}&clinicId=${clinicId}`),
      request({ clinicId: otherId, preferences, expectedRevision: 0 }),
      request({ clinicId, preferences, expectedRevision: 0, actor: "forged" }),
    ])
      expect((await handlers.PUT(r)).status).toBe(400);
    expect(write).not.toHaveBeenCalled();
  });
  it("limita o corpo mesmo sem Content-Length", async () => {
    const { handlers, write } = setup();
    expect((await handlers.PUT(request({ padding: "a".repeat(560001) }))).status).toBe(413);
    expect(write).not.toHaveBeenCalled();
  });
  it("não retorna dados de outra clínica nem detalhes internos", async () => {
    const { handlers, read } = setup();
    read.mockResolvedValue({ ...saved, clinic_id: otherId });
    const result = await handlers.GET(request());
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain(otherId);
  });
  it("ausência é explícita e todas as respostas impedem cache", async () => {
    const { handlers, read } = setup();
    read.mockResolvedValue(null);
    const result = await handlers.GET(request());
    expect(await result.json()).toEqual({ branding: null });
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("conflito preserva resposta segura e não expõe erro SQL", async () => {
    const { handlers, write } = setup();
    write.mockRejectedValue(new AuthError("SQL secret", 409));
    const result = await handlers.PUT(request());
    expect(result.status).toBe(409);
    expect(await result.text()).not.toContain("SQL secret");
  });
});
