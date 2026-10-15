import { expect, it } from "vitest";
import { isAuthorized, type AuthContext, type Action } from "@/lib/auth/core";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222";
const context: AuthContext = {
  currentClinicId: clinic,
  identity: {
    userId: "33333333-3333-4333-8333-333333333333",
    links: [
      {
        clinicId: clinic,
        role: "paciente",
        isActive: true,
        patientId: patient,
        grants: [{ resource: "journey_shields", action: "read" }],
      },
    ],
  },
};
const metadata = {
  ownerClinicId: clinic,
  ownerPatientId: patient,
  patientLink: { clinicId: clinic, patientId: patient, isActive: true },
};
it("own patient read requires active patient metadata and explicit grant", () => {
  expect(isAuthorized(context, "journey_shields", "read", metadata)).toBe(true);
  expect(
    isAuthorized(context, "journey_shields", "read", {
      ...metadata,
      patientLink: { ...metadata.patientLink, isActive: false },
    }),
  ).toBe(false);
  expect(
    isAuthorized(context, "journey_shields", "read", { ...metadata, ownerPatientId: clinic }),
  ).toBe(false);
  const noGrant = {
    ...context,
    identity: {
      ...context.identity,
      links: context.identity.links.map((link) => ({ ...link, grants: [] })),
    },
  };
  expect(isAuthorized(noGrant, "journey_shields", "read", metadata)).toBe(false);
});
it("verified doctor can read only authorized clinic/patient", () => {
  const doctor: AuthContext = {
    ...context,
    identity: {
      ...context.identity,
      links: context.identity.links.map((link) => ({
        ...link,
        role: "medico",
        medicalIdentityVerified: true,
      })),
    },
  };
  expect(isAuthorized(doctor, "journey_shields", "read", metadata)).toBe(true);
  expect(
    isAuthorized(doctor, "journey_shields", "read", { ...metadata, ownerClinicId: patient }),
  ).toBe(false);
  expect(
    isAuthorized(
      {
        ...doctor,
        identity: {
          ...doctor.identity,
          links: doctor.identity.links.map((link) => ({ ...link, medicalIdentityVerified: false })),
        },
      },
      "journey_shields",
      "read",
      metadata,
    ),
  ).toBe(false);
});
it.each(["create", "write", "delete", "manage"] as Action[])(
  "client cannot %s shield calculations even with grant",
  (action) => {
    const allowedGrant: AuthContext = {
      ...context,
      identity: {
        ...context.identity,
        links: context.identity.links.map((link) => ({
          ...link,
          grants: [{ resource: "journey_shields", action }],
        })),
      },
    };
    expect(isAuthorized(allowedGrant, "journey_shields", action, metadata)).toBe(false);
  },
);
it("global operator or clinic admin has no automatic clinical access", () => {
  expect(
    isAuthorized(
      {
        currentClinicId: clinic,
        identity: { ...context.identity, links: [], globalRole: "super_admin" },
      },
      "journey_shields",
      "read",
      metadata,
    ),
  ).toBe(false);
  expect(
    isAuthorized(
      {
        ...context,
        identity: {
          ...context.identity,
          links: context.identity.links.map((link) => ({ ...link, role: "admin" })),
        },
      },
      "journey_shields",
      "read",
      metadata,
    ),
  ).toBe(false);
});
