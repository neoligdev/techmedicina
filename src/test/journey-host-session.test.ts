import { expect, it, vi } from "vitest";
import { createJourneyHostSessionResolver } from "../lib/journey/host-session.server";
import type { AuthenticatedIdentity } from "../lib/auth/core";
import { createJourneyGoalReadHandler } from "../lib/journey/goal-read-handler.server";
const clinic = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002",
  patient = "00000000-0000-4000-8000-000000000003";
const entry = {
  hostname: "clinica.example.com",
  clinicId: clinic,
  environment: "clinic_portal",
  status: "active",
};
const identity: AuthenticatedIdentity = {
  userId: patient,
  globalRole: "super_admin",
  links: [
    {
      clinicId: clinic,
      role: "medico",
      isActive: true,
      medicalIdentityVerified: true,
      grants: [{ resource: "journey_goals", action: "read" }],
    },
    { clinicId: other, role: "admin", isActive: true, grants: [] },
  ],
};
function request(host = "clinica.example.com", forwarded?: string) {
  return new Request(`https://${host}/api/journey/goals`, {
    headers: { host, ...(forwarded ? { "x-forwarded-host": forwarded } : {}) },
  });
}
it("vincula host/sessão da mesma requisição e conserva somente a clínica autorizada", async () => {
  const lookup = vi.fn().mockResolvedValue(entry),
    session = vi.fn().mockResolvedValue({ identity });
  const resolve = createJourneyHostSessionResolver("clinic_portal", lookup, session);
  const req = request("CLINICA.EXAMPLE.COM:443");
  const result = await resolve(req);
  expect(lookup).toHaveBeenCalledWith("clinica.example.com");
  expect(session).toHaveBeenCalledWith(req);
  expect(result!.context.currentClinicId).toBe(clinic);
  expect(result!.context.identity.globalRole).toBeUndefined();
  expect(result!.context.identity.links.map((link) => link.clinicId)).toEqual([clinic]);
});
it("host suspenso em nova consulta não reutiliza contexto anterior", async () => {
  const lookup = vi
    .fn()
    .mockResolvedValueOnce(entry)
    .mockResolvedValueOnce({ ...entry, status: "suspended" });
  const session = vi.fn().mockResolvedValue({ identity });
  const resolve = createJourneyHostSessionResolver("clinic_portal", lookup, session);
  await resolve(request());
  await expect(resolve(request())).rejects.toThrow();
  expect(lookup).toHaveBeenCalledTimes(2);
  expect(session).toHaveBeenCalledTimes(1);
});
it("handler médico usa clínica do host e ignora seleção de clínica enviada pelo browser", async () => {
  const resolve = createJourneyHostSessionResolver(
    "clinic_portal",
    async () => entry,
    async () => ({ identity }),
  );
  const read = vi.fn().mockResolvedValue({
    goal: {
      id: patient,
      clinic_id: clinic,
      patient_id: patient,
      patient_user_id: patient,
      version: 1,
      policy_version_id: patient,
      kind: "hydration",
      cadence: "daily",
      status: "eligible",
      effective_from: "2026-10-13T00:00:00+00:00",
      expires_at: null,
    },
    patientLink: { clinicId: clinic, patientId: patient, isActive: true },
  });
  const handler = createJourneyGoalReadHandler(async (req) => {
    const resolved = await resolve(req);
    return resolved ? { context: resolved.context, read } : null;
  });
  const response = await handler(
    new Request(`https://clinica.example.com/api/journey/goals?goalId=${patient}`, {
      headers: { host: "clinica.example.com", "x-clinic-id": other },
    }),
  );
  expect(response.status).toBe(200);
  expect(read.mock.calls[0]![0].currentClinicId).toBe(clinic);
  expect(
    read.mock.calls[0]![0].identity.links.map((link: { clinicId: string }) => link.clinicId),
  ).toEqual([clinic]);
  expect((await response.json()).goal.clinicId).toBe(clinic);
});
it.each(["pending_verification", "suspended", "retired"])(
  "host %s não inicia resolução Auth",
  async (status) => {
    const session = vi.fn();
    const resolve = createJourneyHostSessionResolver(
      "clinic_portal",
      async () => ({ ...entry, status }),
      session,
    );
    await expect(resolve(request())).rejects.toThrow();
    expect(session).not.toHaveBeenCalled();
  },
);
it("host local, reservado e spoofing não consultam registro nem Auth", async () => {
  const lookup = vi.fn(),
    session = vi.fn(),
    resolve = createJourneyHostSessionResolver("clinic_portal", lookup, session);
  for (const req of [
    request("localhost:8081"),
    request("admin.example.com"),
    request("clinica.example.com", "other.example.com"),
  ])
    await expect(resolve(req)).rejects.toThrow();
  expect(lookup).not.toHaveBeenCalled();
  expect(session).not.toHaveBeenCalled();
});
it("Host divergente da URL não consulta registro sem política de proxy confiável", async () => {
  const lookup = vi.fn(),
    session = vi.fn();
  const resolve = createJourneyHostSessionResolver("clinic_portal", lookup, session);
  await expect(
    resolve(
      new Request("https://other.example.com/api/journey/goals", {
        headers: { host: "clinica.example.com" },
      }),
    ),
  ).rejects.toThrow();
  expect(lookup).not.toHaveBeenCalled();
  expect(session).not.toHaveBeenCalled();
});
it("mapeamento de hostname/ambiente diferente é negado antes do Auth", async () => {
  for (const invalid of [
    { ...entry, hostname: "other.example.com" },
    { ...entry, environment: "patient_pwa" },
    { ...entry, clinicId: "demo" },
  ]) {
    const session = vi.fn();
    await expect(
      createJourneyHostSessionResolver("clinic_portal", async () => invalid, session)(request()),
    ).rejects.toThrow();
    expect(session).not.toHaveBeenCalled();
  }
});
it("cargo global isolado, ADM e médico não verificado não recebem contexto clínico", async () => {
  for (const actor of [
    { ...identity, links: [] },
    { ...identity, links: [{ ...identity.links[0]!, role: "admin" as const }] },
    { ...identity, links: [{ ...identity.links[0]!, medicalIdentityVerified: false }] },
  ])
    await expect(
      createJourneyHostSessionResolver(
        "clinic_portal",
        async () => entry,
        async () => ({ identity: actor }),
      )(request()),
    ).rejects.toThrow();
});
it("PWA só cria contexto para paciente próprio e sessão ausente retorna null", async () => {
  const pwa = { ...entry, hostname: "app.example.com", environment: "patient_pwa" };
  const actor = {
    ...identity,
    links: [
      {
        clinicId: clinic,
        patientId: patient,
        role: "paciente" as const,
        isActive: true,
        grants: [],
      },
    ],
  };
  const resolve = createJourneyHostSessionResolver(
    "patient_pwa",
    async () => pwa,
    async () => ({ identity: actor }),
  );
  expect((await resolve(request("app.example.com")))!.context.identity.links[0]?.patientId).toBe(
    patient,
  );
  expect(
    await createJourneyHostSessionResolver(
      "clinic_portal",
      async () => entry,
      async () => null,
    )(request()),
  ).toBeNull();
});
