import { describe, expect, it } from "vitest";
import { parsePersistedIdentity } from "../lib/auth/persisted-identity";

const user = "00000000-0000-4000-8000-000000000001";
const clinic = "00000000-0000-4000-8000-000000000101";
function payload() {
  return {
    userId: user,
    globalRole: null,
    links: [
      {
        clinicId: clinic,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        patientId: null,
        grants: [{ resource: "prontuario", action: "read" }],
      },
    ],
  };
}
describe("Validação da identidade persistida", () => {
  it("converte somente resultado válido ligado ao usuário confirmado", () => {
    expect(parsePersistedIdentity(payload(), user)).toEqual({
      userId: user,
      links: [
        {
          clinicId: clinic,
          role: "medico",
          isActive: true,
          medicalIdentityVerified: true,
          grants: [{ resource: "prontuario", action: "read" }],
        },
      ],
    });
    expect(parsePersistedIdentity(payload(), "another-user")).toBeNull();
  });
  it.each([
    null,
    {},
    { ...payload(), userId: "invalid" },
    { ...payload(), globalRole: "admin" },
    { ...payload(), links: [payload().links[0], payload().links[0]] },
    { ...payload(), links: [{ ...payload().links[0], role: "super_admin" }] },
    { ...payload(), links: [{ ...payload().links[0], isActive: false }] },
    {
      ...payload(),
      links: [{ ...payload().links[0], grants: [{ resource: "all", action: "manage" }] }],
    },
    { ...payload(), links: [{ ...payload().links[0], role: "paciente" }] },
    { ...payload(), links: [{ ...payload().links[0], role: "admin" }] },
    { ...payload(), extra: "untrusted" },
  ])("nega um documento inválido sem aproveitar grants parciais %#", (invalid) => {
    expect(parsePersistedIdentity(invalid, user)).toBeNull();
  });
  it("aceita operador persistido sem conceder vínculo clínico", () => {
    expect(
      parsePersistedIdentity({ userId: user, globalRole: "super_admin", links: [] }, user),
    ).toEqual({ userId: user, globalRole: "super_admin", links: [] });
  });
});
