// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { createMedicalEvolutionEndpoint } from "@/lib/medical-records/evolution-endpoint.server";
import type { AuthContext } from "@/lib/auth/core";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  doctor = "33333333-3333-4333-8333-333333333333",
  id = "44444444-4444-4444-8444-444444444444";
function setup() {
  const authContext: AuthContext = {
    currentClinicId: clinic,
    identity: {
      userId: doctor,
      links: [
        {
          clinicId: clinic,
          role: "medico",
          isActive: true,
          medicalIdentityVerified: true,
          grants: [
            { resource: "prontuario", action: "read" },
            { resource: "prontuario", action: "create" },
          ],
        },
      ],
    },
  };
  const result = {
    id,
    clinicId: clinic,
    patientId: patient,
    text: "QA fictício",
    author: { userId: doctor, name: "Médico QA", crm: "QA-000", uf: "BA" },
    recordedAt: "2026-10-31T12:00:00.000Z",
    supplementsId: null,
  };
  const session = {
    authContext,
    patientLink: { patientId: patient, clinicId: clinic, isActive: true },
  };
  const providers = {
    resolveContext: vi.fn(async () => session),
    create: vi.fn(async () => result),
    read: vi.fn(async () => result as typeof result | null),
    history: vi.fn(async () => ({ items: [result], nextCursor: null })),
  };
  return { providers, result, session, endpoint: createMedicalEvolutionEndpoint(providers) };
}
const command = { id, text: "QA fictício", supplementsId: null };
const post = (body: unknown = command, headers: Record<string, string> = {}) =>
  new Request("https://clinica.example.test/api/medical/evolutions", {
    method: "POST",
    headers: {
      Authorization: "Bearer qa",
      Origin: "https://clinica.example.test",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
const get = (query: string) =>
  new Request(`https://clinica.example.test/api/medical/evolutions${query}`, {
    headers: { Authorization: "Bearer qa" },
  });
describe("medical HTTP factory without an activated route", () => {
  it("derives scope from the verified context and returns private noncacheable content", async () => {
    const s = setup(),
      response = await s.endpoint(post(), "create");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ result: s.result });
    expect(s.providers.create).toHaveBeenCalledWith(s.session, command);
  });
  it("refuses caller-supplied scope or author fields without writing", async () => {
    const s = setup();
    expect(
      (await s.endpoint(post({ ...command, clinicId: clinic, authorUserId: doctor }), "create"))
        .status,
    ).toBe(400);
    expect(s.providers.create).not.toHaveBeenCalled();
  });
  it("denies missing bearer and cross-origin writes before calling the resolver", async () => {
    const s = setup();
    expect((await s.endpoint(post(command, { Authorization: "" }), "create")).status).toBe(401);
    expect(
      (await s.endpoint(post(command, { Origin: "https://foreign.example.test" }), "create"))
        .status,
    ).toBe(403);
    expect(s.providers.resolveContext).not.toHaveBeenCalled();
  });
  it("denies administrators, unverified doctors and missing create grants", async () => {
    for (const mode of ["admin", "unverified", "no-create"]) {
      const s = setup(),
        link = s.session.authContext.identity.links[0]!;
      if (mode === "admin") link.role = "admin";
      if (mode === "unverified") link.medicalIdentityVerified = false;
      if (mode === "no-create") link.grants = link.grants.filter((g) => g.action !== "create");
      expect((await s.endpoint(post(), "create")).status).toBe(403);
      expect(s.providers.create).not.toHaveBeenCalled();
    }
  });
  it("bounds the actual JSON stream even when Content-Length lies", async () => {
    const s = setup();
    expect(
      (
        await s.endpoint(
          post({ ...command, text: "x".repeat(262145) }, { "Content-Length": "1" }),
          "create",
        )
      ).status,
    ).toBe(413);
    expect(s.providers.create).not.toHaveBeenCalled();
  });
  it("reports post-dispatch failures as uncertain, preserves the ID and never retries", async () => {
    const s = setup();
    s.providers.create.mockRejectedValue(new Error("Secret SQL QA fictício"));
    const response = await s.endpoint(post(), "create");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Resultado não confirmado; consulte o ID original",
      outcome: "uncertain",
      recordId: id,
    });
    expect(s.providers.create).toHaveBeenCalledTimes(1);
  });
  it("contains malformed or foreign write results without releasing their content", async () => {
    const s = setup();
    s.result.patientId = "55555555-5555-4555-8555-555555555555";
    const response = await s.endpoint(post(), "create");
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("QA fictício");
  });
  it("provides exact-ID read recovery and does not mutate", async () => {
    const s = setup();
    expect((await s.endpoint(get(`?id=${id}`), "record")).status).toBe(200);
    expect(s.providers.read).toHaveBeenCalledWith(s.session, id);
    expect(s.providers.create).not.toHaveBeenCalled();
    s.providers.read.mockResolvedValue(null);
    expect((await s.endpoint(get(`?id=${id}`), "record")).status).toBe(404);
  });
  it("rejects duplicate query fields, partial cursors and unexpected methods", async () => {
    const s = setup();
    expect((await s.endpoint(get(`?id=${id}&id=${id}`), "record")).status).toBe(400);
    expect((await s.endpoint(get(`?beforeId=${id}`), "history")).status).toBe(400);
    const response = await s.endpoint(get(""), "create");
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(s.providers.history).not.toHaveBeenCalled();
  });
  it("returns only the authorized history page and blocks inactive patient links", async () => {
    const s = setup();
    expect((await s.endpoint(get(""), "history")).status).toBe(200);
    s.session.patientLink.isActive = false;
    expect((await s.endpoint(get(""), "history")).status).toBe(403);
    expect(s.providers.history).toHaveBeenCalledTimes(1);
  });
});
