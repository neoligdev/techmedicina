import { describe, expect, it, vi } from "vitest";
import { createClinicWriter } from "../lib/admin/clinic-write.server";
import { AuthError } from "../lib/auth/guards.server";
import type { AuthenticatedIdentity } from "../lib/auth/core";

const identity: AuthenticatedIdentity = {
  userId: "operator",
  globalRole: "super_admin",
  links: [],
};
const id = "00000000-0000-4000-8000-000000000001";
const saved = {
  id,
  name: "Clínica",
  is_active: false,
  created_at: "2026-10-10T12:00:00Z",
  revision: 1,
};
const input = { operation: "create", name: "Clínica", isActive: false };
const request = (body: unknown, contentType = "application/json") =>
  new Request("https://local.test/api/platform/clinics", {
    method: "POST",
    headers: { "content-type": contentType },
    body: JSON.stringify(body),
  });
describe("API de escrita administrativa", () => {
  it.each([null, { userId: "unlinked", links: [] }])(
    "nega antes de ler/gravar dados sem autorização",
    async (user) => {
      const write = vi.fn();
      const response = await createClinicWriter(
        async () => (user ? { identity: user } : null),
        write,
      )(request(input));
      expect(response.status).toBe(user ? 403 : 401);
      expect(write).not.toHaveBeenCalled();
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    },
  );
  it("cria somente com campos explícitos e normaliza nome", async () => {
    const write = vi.fn().mockResolvedValue(saved);
    const response = await createClinicWriter(
      async () => ({ identity }),
      write,
    )(request({ ...input, name: "  Clínica  " }));
    expect(response.status).toBe(201);
    expect(write).toHaveBeenCalledWith({ identity }, input);
    expect(await response.json()).toEqual({ clinic: saved });
  });
  it("edição exige ID e revisão esperada", async () => {
    const write = vi.fn().mockResolvedValue({ ...saved, revision: 2 });
    const response = await createClinicWriter(
      async () => ({ identity }),
      write,
    )(request({ ...input, operation: "update", id, expectedRevision: 1 }));
    expect(response.status).toBe(200);
    expect(write.mock.calls[0]![1].expectedRevision).toBe(1);
  });
  it.each([
    { ...input, role: "super_admin" },
    { ...input, actorUserId: id },
    { ...input, operation: "update", id },
    { ...input, operation: "update", id, expectedRevision: 0 },
    { ...input, name: " " },
    { ...input, isActive: "true" },
  ])("recusa payload inválido/extra antes de chamar RPC", async (payload) => {
    const write = vi.fn();
    expect(
      (await createClinicWriter(async () => ({ identity }), write)(request(payload))).status,
    ).toBe(400);
    expect(write).not.toHaveBeenCalled();
  });
  it("recusa tipo de conteúdo e corpo acima do limite sem depender do Content-Length", async () => {
    const write = vi.fn();
    const handler = createClinicWriter(async () => ({ identity }), write);
    expect((await handler(request(input, "text/plain"))).status).toBe(415);
    expect((await handler(request({ ...input, name: "a".repeat(5000) }))).status).toBe(413);
    expect(write).not.toHaveBeenCalled();
  });
  it("recusa JSON malformado", async () => {
    const write = vi.fn();
    const response = await createClinicWriter(
      async () => ({ identity }),
      write,
    )(
      new Request("https://local.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    expect(response.status).toBe(400);
    expect(write).not.toHaveBeenCalled();
  });
  it("conflito não repete gravação nem usa cache", async () => {
    const write = vi
      .fn()
      .mockRejectedValue(new AuthError("A clínica mudou. Recarregue antes de editar.", 409));
    const response = await createClinicWriter(async () => ({ identity }), write)(request(input));
    expect(response.status).toBe(409);
    expect(write).toHaveBeenCalledTimes(1);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("erro de banco e retorno com campos extras ficam indisponíveis sem vazamento", async () => {
    const write = vi.fn().mockRejectedValue(new Error("secret-db-error"));
    const handler = createClinicWriter(async () => ({ identity }), write);
    const response = await handler(request(input));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret-db-error");
    write.mockResolvedValue({ ...saved, clinical_text: "private" });
    const malformed = await handler(request(input));
    expect(malformed.status).toBe(503);
    expect(await malformed.text()).not.toContain("private");
  });
});
