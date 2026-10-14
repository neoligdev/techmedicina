import { expect, it } from "vitest";
import {
  journeyGoalSchema,
  journeySelfReportInputSchema,
  journeyPreferenceInputSchema,
} from "../features/journey/contracts";
import { buildJourneySelfReport } from "../lib/journey/self-report.server";
import { isAuthorized, type AuthContext } from "../lib/auth/core";
import { parsePersistedIdentity } from "../lib/auth/persisted-identity";
const clinic = "00000000-0000-4000-8000-000000000001",
  patient = "00000000-0000-4000-8000-000000000002",
  goalId = "00000000-0000-4000-8000-000000000003",
  user = "00000000-0000-4000-8000-000000000004";
const goal = {
  id: goalId,
  clinicId: clinic,
  patientId: patient,
  version: 1,
  policyVersionId: goalId,
  kind: "hydration",
  cadence: "daily",
  status: "eligible",
  prescriptionId: null,
  effectiveFrom: "2026-10-12T00:00:00Z",
};
const input = { goalId, sourceEventId: user, occurredAt: "2026-10-12T12:00:00Z" };
const patientLink = { patientId: patient, clinicId: clinic, isActive: true };
const metadata = { ownerClinicId: clinic, ownerPatientId: patient, patientLink };
const context: AuthContext = {
  currentClinicId: clinic,
  identity: {
    userId: user,
    links: [
      {
        clinicId: clinic,
        role: "paciente",
        patientId: patient,
        isActive: true,
        grants: [
          { resource: "journey_events", action: "create" },
          { resource: "journey_goals", action: "read" },
        ],
      },
    ],
  },
};
const received = "2026-10-12T12:01:00Z";
it("preferência exige revisão e rejeita ator/clínica fornecidos pelo cliente", () => {
  const preference = { patientId: patient, isEnabled: false, expectedRevision: 1 };
  expect(journeyPreferenceInputSchema.safeParse(preference).success).toBe(true);
  for (const invalid of [
    { ...preference, expectedRevision: -1 },
    { ...preference, expectedRevision: undefined },
    { ...preference, clinicId: clinic },
    { ...preference, actorUserId: user },
    { ...preference, isEnabled: "true" },
  ])
    expect(journeyPreferenceInputSchema.safeParse(invalid).success).toBe(false);
});
it.each(["medication", "protocol"])(
  "bloqueia autorrelato %s sem fluxo clínico validado",
  (kind) => {
    expect(() =>
      buildJourneySelfReport(
        context,
        input,
        { ...goal, kind, prescriptionId: goalId },
        patientLink,
        received,
      ),
    ).toThrow();
  },
);
it("monta autorrelato com paciente/autor/versão da origem confiável e sem score", () => {
  const result = buildJourneySelfReport(context, input, goal, patientLink, received);
  expect(result).toEqual({
    clinicId: clinic,
    patientId: patient,
    goalId,
    goalVersion: 1,
    policyVersionId: goalId,
    sourceEventId: user,
    source: "self_report",
    actorUserId: user,
    occurredAt: input.occurredAt,
    receivedAt: received,
  });
  expect(result).not.toHaveProperty("points");
});
it.each(["clinicId", "patientId", "actorUserId", "points", "source", "status"])(
  "recusa campo forjado %s no envio",
  (field) => {
    expect(journeySelfReportInputSchema.safeParse({ ...input, [field]: "forged" }).success).toBe(
      false,
    );
  },
);
it("medicação exige referência à prescrição, sem fingir validá-la", () => {
  expect(journeyGoalSchema.safeParse({ ...goal, kind: "medication" }).success).toBe(false);
  expect(
    journeyGoalSchema.safeParse({ ...goal, kind: "medication", prescriptionId: goalId }).success,
  ).toBe(true);
});
it.each(["paused", "not_applicable"])("não aceita participação em meta %s", (status) => {
  expect(() =>
    buildJourneySelfReport(context, input, { ...goal, status }, patientLink, received),
  ).toThrow();
});
it("nega outra clínica, outro paciente, vínculo inativo, meta diferente e falta de grant", () => {
  for (const altered of [
    { ...goal, clinicId: goalId },
    { ...goal, patientId: goalId },
    { ...goal, id: patient },
  ])
    expect(() => buildJourneySelfReport(context, input, altered, patientLink, received)).toThrow();
  expect(() =>
    buildJourneySelfReport(context, input, goal, { ...patientLink, isActive: false }, received),
  ).toThrow();
  const noGrant = {
    ...context,
    identity: {
      ...context.identity,
      links: context.identity.links.map((link) => ({ ...link, grants: [] })),
    },
  };
  expect(() => buildJourneySelfReport(noGrant, input, goal, patientLink, received)).toThrow();
});
it.each(["2026-10-11T12:00:00Z", "2026-10-13T12:00:00Z"])(
  "recusa evento fora da vigência/recebimento: %s",
  (occurredAt) => {
    expect(() =>
      buildJourneySelfReport(context, { ...input, occurredAt }, goal, patientLink, received),
    ).toThrow();
  },
);
it("paciente lê metas próprias mas não altera elegibilidade", () => {
  expect(isAuthorized(context, "journey_goals", "read", metadata)).toBe(true);
  expect(isAuthorized(context, "journey_goals", "write", metadata)).toBe(false);
  expect(
    isAuthorized(context, "journey_events", "create", {
      ...metadata,
      ownerPatientId: user,
      patientLink: { ...patientLink, patientId: user },
    }),
  ).toBe(false);
});
it("médico verificado com grant administra metas, sem criar autorrelato pelo paciente", () => {
  const doctor: AuthContext = {
    ...context,
    identity: {
      userId: user,
      links: [
        {
          clinicId: clinic,
          role: "medico",
          isActive: true,
          medicalIdentityVerified: true,
          grants: [
            { resource: "journey_goals", action: "write" },
            { resource: "journey_events", action: "create" },
          ],
        },
      ],
    },
  };
  expect(isAuthorized(doctor, "journey_goals", "write", metadata)).toBe(true);
  expect(isAuthorized(doctor, "journey_events", "create", metadata)).toBe(false);
  doctor.identity.links[0]!.medicalIdentityVerified = false;
  expect(isAuthorized(doctor, "journey_goals", "write", metadata)).toBe(false);
});
it("admin e cargo Super ADM não recebem acesso clínico novo", () => {
  const admin: AuthContext = {
    ...context,
    identity: {
      userId: user,
      globalRole: "super_admin",
      links: [{ ...context.identity.links[0]!, role: "admin" }],
    },
  };
  expect(isAuthorized(admin, "journey_events", "create", metadata)).toBe(false);
  expect(isAuthorized(admin, "journey_goals", "read", metadata)).toBe(false);
});
it("aceita novos grants somente no contrato de identidade persistida", () => {
  expect(
    parsePersistedIdentity(
      {
        userId: user,
        globalRole: null,
        links: [{ ...context.identity.links[0]!, medicalIdentityVerified: false }],
      },
      user,
    ),
  ).not.toBeNull();
});
