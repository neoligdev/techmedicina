// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { createSelfReportStatusEndpoint } from "@/lib/journey/self-report-status-endpoint.server";
import { createOwnSelfReportStatusClient } from "@/features/journey/self-report-status-client";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  source = "33333333-3333-4333-8333-333333333333";
const event = {
  id: "44444444-4444-4444-8444-444444444444",
  goalId: clinic,
  sourceEventId: source,
  occurredAt: "2026-10-01T10:00:00.123456Z",
  receivedAt: "2026-10-01T10:00:01Z",
};
const report = { clinicId: clinic, patientId: patient, event };
function setup() {
  const identity: AuthenticatedIdentity = {
    userId: source,
    links: [
      {
        clinicId: clinic,
        patientId: patient,
        role: "paciente",
        isActive: true,
        grants: [{ resource: "journey_events", action: "read" }],
      },
    ],
  };
  const session = { identity };
  const resolveSession = vi.fn(async () => session as typeof session | null),
    read = vi.fn(async (): Promise<unknown> => report);
  const endpoint = createSelfReportStatusEndpoint({
    lookup: async (hostname) => ({
      hostname,
      clinicId: clinic,
      environment: "patient_pwa",
      status: "active",
    }),
    resolveSession,
    read,
  });
  return { identity, session, resolveSession, read, endpoint };
}
const req = (query = "?sourceEventId=" + source, method = "GET") =>
  new Request("https://app.example.com/api/journey/self-report-status" + query, {
    method,
    headers: { host: "app.example.com" },
  });
it("reads only host clinic and source key with same session, preserving timestamp precision", async () => {
  const { endpoint, read, session } = setup();
  const result = await endpoint(req());
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ report });
  expect(read).toHaveBeenCalledWith(session, { p_clinic_id: clinic, p_source_event_id: source });
  expect(result.headers.get("cache-control")).toBe("private, no-store");
});
it("rejects caller patient/clinic, duplicate keys, malformed UUID, missing key and mutation before resolving", async () => {
  const { endpoint, resolveSession } = setup();
  for (const q of [
    "",
    "?sourceEventId=invalid",
    "?sourceEventId=" + source + "&sourceEventId=" + source,
    "?sourceEventId=" + source + "&patientId=" + patient,
  ])
    expect((await endpoint(req(q))).status).toBe(400);
  expect((await endpoint(req("", "POST"))).status).toBe(405);
  expect(resolveSession).not.toHaveBeenCalled();
});
it("requires own patient read grant and rejects anonymous or global administrator without patient link", async () => {
  const { endpoint, resolveSession, identity, read } = setup();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(req())).status).toBe(401);
  identity.links[0]!.grants = [];
  expect((await endpoint(req())).status).toBe(403);
  identity.links = [];
  identity.globalRole = "super_admin";
  expect((await endpoint(req())).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
});
it("rejects foreign response and mismatched source; authorized absence returns null", async () => {
  const { endpoint, read } = setup();
  for (const wrong of [
    { ...report, patientId: source },
    { ...report, event: { ...event, sourceEventId: patient } },
    { ...report, event: { ...event, actor: source } },
  ]) {
    read.mockResolvedValueOnce(wrong);
    expect((await endpoint(req())).status).toBe(503);
  }
  read.mockResolvedValueOnce({ ...report, event: null });
  expect(await (await endpoint(req())).json()).toEqual({ report: { ...report, event: null } });
});
it("client preserves fresh bearer and validates response scope/source", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ report }));
  const client = createOwnSelfReportStatusClient(
    { clinicId: clinic, patientId: patient, getAccessToken: async () => "qa" },
    fetcher,
  );
  expect(await client(source)).toEqual(event);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/journey/self-report-status?sourceEventId=" + source,
    expect.objectContaining({
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      headers: { Authorization: "Bearer qa" },
    }),
  );
  fetcher.mockResolvedValueOnce(
    Response.json({ report: { ...report, event: { ...event, sourceEventId: patient } } }),
  );
  await expect(client(source)).rejects.toThrow();
});
