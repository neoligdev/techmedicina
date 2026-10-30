import { parsePersistedIdentity } from "@/lib/auth/persisted-identity";
import { it, expect } from "vitest";
import { isAuthorized, type AuthContext } from "@/lib/auth/core";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222";
function context(): AuthContext {
  return {
    currentClinicId: clinic,
    identity: {
      userId: "33333333-3333-4333-8333-333333333333",
      links: [
        {
          clinicId: clinic,
          role: "paciente",
          isActive: true,
          patientId: patient,
          grants: [
            { resource: "hydration_records", action: "read" },
            { resource: "hydration_records", action: "create" },
            { resource: "hydration_records", action: "write" },
          ],
        },
      ],
    },
  };
}
const metadata = {
  ownerClinicId: clinic,
  ownerPatientId: patient,
  patientLink: { clinicId: clinic, patientId: patient, isActive: true },
};
it("allows only explicitly granted own patient hydration actions", () => {
  const c = context();
  for (const action of ["read", "create", "write"] as const)
    expect(isAuthorized(c, "hydration_records", action, metadata)).toBe(true);
  for (const action of ["delete", "manage"] as const)
    expect(isAuthorized(c, "hydration_records", action, metadata)).toBe(false);
});
it("denies another owner, missing read grant, inactive patient or membership", () => {
  expect(
    isAuthorized(context(), "hydration_records", "read", { ...metadata, ownerPatientId: clinic }),
  ).toBe(false);
  const c = context();
  c.identity.links[0]!.grants = c.identity.links[0]!.grants.filter((g) => g.action !== "read");
  expect(isAuthorized(c, "hydration_records", "create", metadata)).toBe(false);
  expect(
    isAuthorized(context(), "hydration_records", "read", {
      ...metadata,
      patientLink: { ...metadata.patientLink, isActive: false },
    }),
  ).toBe(false);
  const inactive = context();
  inactive.identity.links[0]!.isActive = false;
  expect(isAuthorized(inactive, "hydration_records", "read", metadata)).toBe(false);
});
it("does not grant hydration access to physician, clinic admin or platform role", () => {
  for (const role of ["medico", "admin", "super_admin"] as const) {
    const c = context();
    c.identity.links[0]!.role = role;
    c.identity.links[0]!.medicalIdentityVerified = true;
    c.identity.globalRole = "super_admin";
    expect(isAuthorized(c, "hydration_records", "read", metadata)).toBe(false);
  }
});

it("accepts hydration grants only in a verified persisted identity response", () => {
  const c = context();
  const value = {
    userId: c.identity.userId,
    globalRole: null,
    links: c.identity.links.map((l) => ({ ...l, medicalIdentityVerified: false })),
  };
  const parsed = parsePersistedIdentity(value, c.identity.userId);
  expect(parsed?.links[0]?.grants.some((g) => g.resource === "hydration_records")).toBe(true);
  expect(parsePersistedIdentity(value, patient)).toBeNull();
});
