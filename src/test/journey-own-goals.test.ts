// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { createOwnGoalsEndpoint } from "@/lib/journey/own-goals-endpoint.server";
import { createOwnGoalsClient } from "@/features/journey/own-goals-client";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  user = "33333333-3333-4333-8333-333333333333";
const goal = {
  id: user,
  kind: "hydration",
  cadence: "daily",
  status: "eligible",
  version: 1,
  effectiveFrom: "2026-10-01T10:00:00Z",
  expiresAt: null,
};
const page = { clinicId: clinic, patientId: patient, goals: [goal], nextCursor: null };
function setup() {
  const identity: AuthenticatedIdentity = {
    userId: user,
    links: [
      {
        clinicId: clinic,
        patientId: patient,
        role: "paciente",
        isActive: true,
        grants: [{ resource: "journey_goals", action: "read" }],
      },
    ],
  };
  const session = { identity };
  const read = vi.fn(async (): Promise<unknown> => page);
  const resolveSession = vi.fn(async () => session as typeof session | null);
  const endpoint = createOwnGoalsEndpoint({
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
  new Request(`https://app.example.com/api/journey/own-goals${query}`, {
    method,
    headers: { host: "app.example.com" },
  });
it("client/server preserves persisted goal snapshot and passes only host clinic plus pagination to same session", async () => {
  const { endpoint, read, session } = setup();
  const fetcher: typeof fetch = async (input, init) =>
    endpoint(
      new Request(new URL(String(input), "https://app.example.com"), {
        ...init,
        headers: { ...init?.headers, host: "app.example.com" },
      }),
    );
  expect(
    await createOwnGoalsClient(
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
    "?after=invalid",
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
    { ...page, goals: [{ ...goal, actorUserId: user }] },
    { ...page, goals: [goal, goal] },
    { ...page, nextCursor: clinic },
  ]) {
    const { endpoint, read } = setup();
    read.mockResolvedValueOnce(wrong);
    const result = await endpoint(request());
    expect(result.status).toBe(503);
    expect(await result.text()).toContain("Metas temporariamente indisponíveis");
  }
});
it("client rejects scope mismatch, repeated cursor and oversized page; requires fresh bearer", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const scope = { clinicId: clinic, patientId: patient, getAccessToken: async () => "qa" };
  fetcher.mockResolvedValueOnce(Response.json({ page: { ...page, clinicId: user } }));
  await expect(createOwnGoalsClient(scope, fetcher)()).rejects.toThrow();
  fetcher.mockResolvedValueOnce(Response.json({ page }));
  await expect(createOwnGoalsClient(scope, fetcher)({ after: user })).rejects.toThrow();
  fetcher.mockResolvedValueOnce(
    Response.json({
      page: { ...page, goals: [goal, { ...goal, id: patient, kind: "sleep" }] },
    }),
  );
  await expect(createOwnGoalsClient(scope, fetcher)({ limit: 1 })).rejects.toThrow();
  const missing = vi.fn<typeof fetch>();
  await expect(
    createOwnGoalsClient({ ...scope, getAccessToken: async () => null }, missing)(),
  ).rejects.toThrow();
  expect(missing).not.toHaveBeenCalled();
});

it("passes a valid cursor, keeps paused and prescription kinds as read-only snapshots", async () => {
  const { endpoint, read, session } = setup();
  const result = await endpoint(request("?after=" + patient + "&limit=1"));
  expect(result.status).toBe(200);
  expect(read).toHaveBeenCalledWith(session, { p_clinic_id: clinic, p_after: patient, p_limit: 1 });
  for (const kind of ["medication", "protocol"]) {
    read.mockResolvedValueOnce({ ...page, goals: [{ ...goal, kind, status: "paused" }] });
    expect((await endpoint(request())).status).toBe(200);
  }
});
it("rejects backwards cursor pages and malformed validity windows", async () => {
  const { endpoint, read } = setup();
  expect((await endpoint(request("?after=" + user))).status).toBe(503);
  read.mockResolvedValueOnce({
    ...page,
    goals: [{ ...goal, expiresAt: "2026-09-01T00:00:00Z" }],
  });
  expect((await endpoint(request())).status).toBe(503);
});
