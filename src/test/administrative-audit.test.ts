import { describe, expect, it, vi } from "vitest";
import { createAuditDirectory } from "../lib/admin/audit-directory.server";
import type { AuthenticatedIdentity } from "../lib/auth/core";
const id = "00000000-0000-4000-8000-000000000001";
const event = {
  id,
  actor_user_id: id,
  clinic_id: id,
  action: "clinic_created",
  changed_fields: ["name", "is_active"],
  occurred_at: "2026-10-10T12:00:00Z",
};
const identity: AuthenticatedIdentity = { userId: id, globalRole: "super_admin", links: [] };
describe("Consulta global de auditoria administrativa", () => {
  it("nega anônimo antes de consultar banco", async () => {
    const read = vi.fn();
    const response = await createAuditDirectory(async () => null, read)();
    expect(response.status).toBe(401);
    expect(read).not.toHaveBeenCalled();
  });
  it.each(["admin", "medico", "paciente"] as const)(
    "nega %s mesmo com grant local",
    async (role) => {
      const read = vi.fn();
      const local: AuthenticatedIdentity = {
        userId: id,
        links: [
          {
            clinicId: id,
            role,
            isActive: true,
            grants: [{ resource: "cadastro_clinica", action: "read" }],
          },
        ],
      };
      expect((await createAuditDirectory(async () => ({ identity: local }), read)()).status).toBe(
        403,
      );
      expect(read).not.toHaveBeenCalled();
    },
  );
  it("operador consulta eventos sem valores de cadastro/conteúdo clínico", async () => {
    const response = await createAuditDirectory(
      async () => ({ identity }),
      async () => [event],
    )();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ events: [event], hasMore: false });
  });
  it("campos extras ou evento clínico não entram na resposta", async () => {
    const response = await createAuditDirectory(
      async () => ({ identity }),
      async () => [{ ...event, medical_text: "private" }],
    )();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
    expect(
      (
        await createAuditDirectory(
          async () => ({ identity }),
          async () => [{ ...event, action: "clinical_read" }],
        )()
      ).status,
    ).toBe(503);
  });
  it("limita resposta e informa mais registros", async () => {
    const response = await createAuditDirectory(
      async () => ({ identity }),
      async () => Array.from({ length: 101 }, () => event),
    )();
    const result = await response.json();
    expect(result.events).toHaveLength(100);
    expect(result.hasMore).toBe(true);
  });
  it("banco indisponível não expõe detalhes internos", async () => {
    const response = await createAuditDirectory(
      async () => ({ identity }),
      async () => {
        throw new Error("private database details");
      },
    )();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
  });
});
