import { describe, expect, it } from "vitest";
import { HostResolver } from "../lib/white-label/host-resolver";
import { createHostAuthContext } from "../lib/white-label/host-auth-context.server";
import { isAuthorized, type AuthenticatedIdentity, type ClinicLink } from "../lib/auth/core";
const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
const patient = "00000000-0000-4000-8000-000000000003";
const resolver = new HostResolver([
  { hostname: "central.qa.test", environment: "central", status: "active" },
  { hostname: "gestao.a.test", environment: "clinic_portal", clinicId: a, status: "active" },
  { hostname: "gestao.b.test", environment: "clinic_portal", clinicId: b, status: "active" },
  { hostname: "app.a.test", environment: "patient_pwa", clinicId: a, status: "active" },
  {
    hostname: "pending.a.test",
    environment: "clinic_portal",
    clinicId: a,
    status: "pending_verification",
  },
]);
function identity(links: ClinicLink[], global = false): AuthenticatedIdentity {
  return { userId: patient, links, ...(global ? { globalRole: "super_admin" as const } : {}) };
}
const admin: ClinicLink = {
  clinicId: a,
  role: "admin",
  isActive: true,
  grants: [{ resource: "cadastro_clinica", action: "manage" }],
};
describe("Contexto autenticado vinculado ao host confiável", () => {
  it("exige sessão e nega host pendente ou demo", () => {
    expect(() => createHostAuthContext(resolver.resolveHost("gestao.a.test"), null)).toThrow(
      "Session required",
    );
    for (const hostname of ["pending.a.test", "localhost", "unknown.example.com"])
      expect(() =>
        createHostAuthContext(resolver.resolveHost(hostname), identity([admin], true)),
      ).toThrow();
  });
  it("no central exige Super ADM e remove vínculos clínicos", () => {
    const host = resolver.resolveHost("central.qa.test");
    expect(() => createHostAuthContext(host, identity([admin]))).toThrow();
    const context = createHostAuthContext(host, identity([admin], true));
    expect(context.identity.links).toEqual([]);
    expect(context.currentClinicId).toBeUndefined();
    expect(isAuthorized(context, "paciente", "read", { ownerClinicId: a })).toBe(false);
  });
  it("conta com vários vínculos conserva somente a clínica do domínio", () => {
    const context = createHostAuthContext(
      resolver.resolveHost("gestao.a.test"),
      identity([admin, { ...admin, clinicId: b }], true),
    );
    expect(context.currentClinicId).toBe(a);
    expect(context.identity.globalRole).toBeUndefined();
    expect(context.identity.links.map((link) => link.clinicId)).toEqual([a]);
    expect(isAuthorized(context, "cadastro_clinica", "manage", { ownerClinicId: b })).toBe(false);
  });
  it("Super ADM sem vínculo local não ganha acesso à clínica", () => {
    expect(() =>
      createHostAuthContext(resolver.resolveHost("gestao.b.test"), identity([admin], true)),
    ).toThrow();
  });
  it("nega vínculo suspenso ou duplicado", () => {
    const host = resolver.resolveHost("gestao.a.test");
    expect(() => createHostAuthContext(host, identity([{ ...admin, isActive: false }]))).toThrow();
    expect(() => createHostAuthContext(host, identity([admin, admin]))).toThrow();
  });
  it("médico exige identidade verificada para portal", () => {
    const host = resolver.resolveHost("gestao.a.test");
    const doctor: ClinicLink = { ...admin, role: "medico", medicalIdentityVerified: false };
    expect(() => createHostAuthContext(host, identity([doctor]))).toThrow();
    expect(
      createHostAuthContext(host, identity([{ ...doctor, medicalIdentityVerified: true }]))
        .currentClinicId,
    ).toBe(a);
  });
  it("PWA exige vínculo de paciente e portal recusa esse papel", () => {
    const link: ClinicLink = { ...admin, role: "paciente", patientId: patient };
    expect(() =>
      createHostAuthContext(resolver.resolveHost("app.a.test"), identity([admin])),
    ).toThrow();
    expect(
      createHostAuthContext(resolver.resolveHost("app.a.test"), identity([link])).currentClinicId,
    ).toBe(a);
    expect(() =>
      createHostAuthContext(resolver.resolveHost("gestao.a.test"), identity([link])),
    ).toThrow();
    expect(() =>
      createHostAuthContext(
        resolver.resolveHost("app.a.test"),
        identity([{ ...link, patientId: "invalid" }]),
      ),
    ).toThrow();
  });
});
