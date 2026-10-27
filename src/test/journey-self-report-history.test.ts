// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { createSelfReportHistoryEndpoint } from "@/lib/journey/self-report-history-endpoint.server";
import { createOwnSelfReportHistoryClient } from "@/features/journey/self-report-history-client";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  user = "33333333-3333-4333-8333-333333333333";
const event = {
  id: user,
  goalId: clinic,
  sourceEventId: user,
  occurredAt: "2026-10-01T10:00:00Z",
  receivedAt: "2026-10-01T10:00:01.123456Z",
};
const page = { clinicId: clinic, patientId: patient, events: [event], nextCursor: null };
function setup() {
  const identity: AuthenticatedIdentity = {
    userId: user,
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
  const read = vi.fn(async () => page);
  const resolveSession = vi.fn(async () => session as typeof session | null);
  const endpoint = createSelfReportHistoryEndpoint({
    lookup: async (hostname) => ({
      hostname,
      clinicId: clinic,
      environment: "patient_pwa",
      status: "active",
    }),
    resolveSession,
    read,
  });
  return { identity, session, read, resolveSession, endpoint };
}
const request = (query = "", method = "GET") =>
  new Request(`https://app.example.com/api/journey/self-reports${query}`, {
    method,
    headers: { host: "app.example.com" },
  });
it("client/server preserves microsecond timestamp and passes only host clinic plus pagination to same session", async () => {
  const { endpoint, read, session } = setup();
  const fetcher: typeof fetch = async (input, init) =>
    endpoint(
      new Request(new URL(String(input), "https://app.example.com"), {
        ...init,
        headers: { ...init?.headers, host: "app.example.com" },
      }),
    );
  expect(
    await createOwnSelfReportHistoryClient(
      { clinicId: clinic, patientId: patient, getAccessToken: async () => "qa" },
      fetcher,
    )(),
  ).toEqual(page);
  expect(read).toHaveBeenCalledWith(session, { p_clinic_id: clinic, p_limit: 25 });
});
it("rejects identities, duplicate/invalid params and mutation before reading session", async () => {
  const { endpoint, read, resolveSession } = setup();
  for (const query of [
    "?patientId=other",
    "?limit=1&limit=2",
    "?limit=0",
    "?limit=1e1",
    "?before=invalid",
  ])
    expect((await endpoint(request(query))).status).toBe(400);
  expect((await endpoint(request("", "POST"))).status).toBe(405);
  expect(read).not.toHaveBeenCalled();
  expect(resolveSession).not.toHaveBeenCalled();
});
it("denies missing session, grant revocation, other clinic and global admin without link", async () => {
  const { endpoint, resolveSession, identity, read } = setup();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(request())).status).toBe(401);
  identity.links[0]!.grants = [];
  expect((await endpoint(request())).status).toBe(403);
  identity.links[0]!.clinicId = user;
  expect((await endpoint(request())).status).toBe(403);
  identity.links = [];
  identity.globalRole = "super_admin";
  expect((await endpoint(request())).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
});
it("rejects foreign payload, extra actor and duplicate records without diagnostic leaks", async () => {
  for (const wrong of [
    { ...page, patientId: user },
    { ...page, events: [{ ...event, actorUserId: user }] },
    { ...page, events: [event, event] },
    { ...page, nextCursor: clinic },
  ]) {
    const { endpoint, read } = setup();
    read.mockResolvedValueOnce(wrong as typeof page);
    const result = await endpoint(request());
    expect(result.status).toBe(503);
    expect(await result.text()).toContain("indisponível");
  }
});
it("client rejects scope mismatch, repeated cursor and oversized page; requires fresh bearer", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const scope = { clinicId: clinic, patientId: patient, getAccessToken: async () => "qa" };
  fetcher.mockResolvedValueOnce(Response.json({ page: { ...page, clinicId: user } }));
  await expect(createOwnSelfReportHistoryClient(scope, fetcher)()).rejects.toThrow();
  fetcher.mockResolvedValueOnce(Response.json({ page }));
  await expect(
    createOwnSelfReportHistoryClient(scope, fetcher)({ before: user }),
  ).rejects.toThrow();
  fetcher.mockResolvedValueOnce(
    Response.json({
      page: { ...page, events: [event, { ...event, id: patient, sourceEventId: patient }] },
    }),
  );
  await expect(createOwnSelfReportHistoryClient(scope, fetcher)({ limit: 1 })).rejects.toThrow();
  const missing = vi.fn<typeof fetch>();
  await expect(
    createOwnSelfReportHistoryClient({ ...scope, getAccessToken: async () => null }, missing)(),
  ).rejects.toThrow();
  expect(missing).not.toHaveBeenCalled();
});
