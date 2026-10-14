import { expect, it, vi } from "vitest";
import { createJourneyPreferenceHandlers } from "../lib/journey/preference-handlers.server";
import { AuthError } from "../lib/auth/guards.server";
import type { AuthContext } from "../lib/auth/core";
const clinic = "00000000-0000-4000-8000-000000000001",
  patient = "00000000-0000-4000-8000-000000000002",
  user = "00000000-0000-4000-8000-000000000003";
const context: AuthContext = {
  currentClinicId: clinic,
  identity: {
    userId: user,
    links: [{ clinicId: clinic, patientId: patient, role: "paciente", isActive: true, grants: [] }],
  },
};
const row = {
  clinic_id: clinic,
  patient_id: patient,
  patient_user_id: user,
  is_enabled: false,
  revision: 0,
};
const url = "https://app.clinica.test/api/journey/participation";
it("método trocado é recusado antes de sessão ou banco", async () => {
  const resolve = vi.fn();
  const handlers = createJourneyPreferenceHandlers(resolve);
  const read = await handlers.GET(new Request(url, { method: "POST" }));
  const write = await handlers.PUT(new Request(url));
  expect(read.status).toBe(405);
  expect(read.headers.get("allow")).toBe("GET");
  expect(write.status).toBe(405);
  expect(write.headers.get("allow")).toBe("PUT");
  expect(write.headers.get("cache-control")).toBe("private, no-store");
  expect(resolve).not.toHaveBeenCalled();
});
function put(body: string, type = "application/json") {
  return new Request(url, { method: "PUT", headers: { "content-type": type }, body });
}
it("GET deriva paciente da sessão sem parâmetro e não grava preferências", async () => {
  const rpc = vi.fn().mockResolvedValue(row);
  const handlers = createJourneyPreferenceHandlers(async () => ({ context, rpc }));
  const response = await handlers.GET(new Request(url));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    preference: { clinicId: clinic, patientId: patient, isEnabled: false, revision: 0 },
  });
  expect(rpc).toHaveBeenCalledWith("tm_get_journey_preference", { p_patient_id: patient });
});
it("PUT pausa e retorna revisão validada", async () => {
  const rpc = vi.fn().mockResolvedValue({ ...row, revision: 2 });
  const handlers = createJourneyPreferenceHandlers(async () => ({ context, rpc }));
  const response = await handlers.PUT(
    put(JSON.stringify({ patientId: patient, isEnabled: false, expectedRevision: 1 })),
  );
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("tm_set_journey_preference", {
    p_patient_id: patient,
    p_is_enabled: false,
    p_expected_revision: 1,
  });
});
it.each([
  ["{", "application/json", 400],
  [
    JSON.stringify({ patientId: patient, isEnabled: false, expectedRevision: 1, clinicId: clinic }),
    "application/json",
    400,
  ],
  ["x".repeat(4097), "application/json", 413],
  ["{}", "text/plain", 415],
])("payload inválido não chega ao RPC", async (body, type, status) => {
  const rpc = vi.fn();
  const handlers = createJourneyPreferenceHandlers(async () => ({ context, rpc }));
  expect((await handlers.PUT(put(body as string, type as string))).status).toBe(status);
  expect(rpc).not.toHaveBeenCalled();
});
it("sem sessão ou com parâmetros alheios não chama banco", async () => {
  const resolve = vi.fn().mockResolvedValue(null);
  const handlers = createJourneyPreferenceHandlers(resolve);
  expect((await handlers.GET(new Request(url))).status).toBe(401);
  resolve.mockClear();
  expect((await handlers.GET(new Request(url + "?clinicId=" + clinic))).status).toBe(400);
  expect(resolve).not.toHaveBeenCalled();
});
it("vínculos ambíguos e cargo global sem paciente são negados", async () => {
  for (const identity of [
    { ...context.identity, links: [...context.identity.links, ...context.identity.links] },
    { ...context.identity, globalRole: "super_admin" as const, links: [] },
  ]) {
    const rpc = vi.fn();
    const handlers = createJourneyPreferenceHandlers(async () => ({
      context: { ...context, identity },
      rpc,
    }));
    expect((await handlers.GET(new Request(url))).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  }
});
it("conflito retorna 409 sem expor detalhes do banco", async () => {
  const rpc = vi.fn().mockRejectedValue(new AuthError("secret database detail", 409));
  const handlers = createJourneyPreferenceHandlers(async () => ({ context, rpc }));
  const response = await handlers.PUT(
    put(JSON.stringify({ patientId: patient, isEnabled: false, expectedRevision: 1 })),
  );
  expect(response.status).toBe(409);
  expect(await response.text()).not.toContain("secret");
});
it("resposta de outra clínica falha sem dados alheios", async () => {
  const rpc = vi.fn().mockResolvedValue({ ...row, clinic_id: user });
  const handlers = createJourneyPreferenceHandlers(async () => ({ context, rpc }));
  const response = await handlers.GET(new Request(url));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain(user);
});
