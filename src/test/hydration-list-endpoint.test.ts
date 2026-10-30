// @vitest-environment node
import { it, expect, vi } from "vitest";
import { createOwnHydrationListEndpoint } from "@/lib/hydration/list-endpoint.server";
import type { AuthContext } from "@/lib/auth/core";
import { validateHydrationPage } from "@/features/hydration/list-contract";
const clinicId = "11111111-1111-4111-8111-111111111111",
  patientId = "22222222-2222-4222-8222-222222222222",
  id = "33333333-3333-4333-8333-333333333333";
const query = { from: "2026-10-29T00:00:00Z", until: "2026-10-30T00:00:00Z", limit: 25 };
const record = {
  id,
  clinicId,
  patientId,
  revision: 1,
  status: "active",
  volumeMl: 250,
  occurredAt: "2026-10-29T12:00:00Z",
};
const page = {
  clinicId,
  patientId,
  from: query.from,
  until: query.until,
  records: [record],
  nextCursor: null,
};
function setup() {
  const session = {
    authContext: {
      identity: {
        userId: id,
        links: [
          {
            clinicId,
            role: "paciente",
            isActive: true,
            patientId,
            grants: [{ resource: "hydration_records", action: "read" }],
          },
        ],
      },
      currentClinicId: clinicId,
    } as AuthContext,
    patientId,
    patientLink: { clinicId, patientId, isActive: true },
  };
  const resolveContext = vi.fn(async () => session as typeof session | null),
    read = vi.fn(async (): Promise<unknown> => page);
  return {
    session,
    resolveContext,
    read,
    endpoint: createOwnHydrationListEndpoint({ resolveContext, read }),
  };
}
const request = (extra = "", method = "GET") =>
  new Request(
    "https://paciente.example/api/hydration/records?from=" +
      query.from +
      "&until=" +
      query.until +
      extra,
    { method },
  );
it("uses resolved patient context and returns a private verified page", async () => {
  const { endpoint, read, session } = setup(),
    r = await endpoint(request());
  expect(await r.json()).toEqual({ page });
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(r.headers.get("vary")).toBe("Authorization, Host");
  expect(read).toHaveBeenCalledWith(session, {
    p_clinic_id: clinicId,
    p_from: query.from,
    p_until: query.until,
    p_limit: 25,
  });
});
it("rejects supplied scope, duplicate cursors, malformed limits and reversed bounds before RPC", async () => {
  const { endpoint, read } = setup();
  for (const extra of [
    "&clinicId=" + clinicId,
    "&patientId=" + patientId,
    "&limit=101",
    "&limit=1e1",
    "&after=bad",
    "&limit=2&limit=3",
    "&from=" + query.from,
  ])
    expect((await endpoint(request(extra))).status).toBe(400);
  expect(
    (
      await endpoint(
        new Request(
          "https://paciente.example/api/hydration/records?from=" +
            query.until +
            "&until=" +
            query.from,
        ),
      )
    ).status,
  ).toBe(400);
  expect((await endpoint(request("", "POST"))).status).toBe(405);
  expect(read).not.toHaveBeenCalled();
});
it("requires live own patient grants and rejects admin and foreign patient context", async () => {
  const { endpoint, resolveContext, session, read } = setup();
  resolveContext.mockResolvedValueOnce(null);
  expect((await endpoint(request())).status).toBe(401);
  session.authContext.identity.links[0]!.role = "admin";
  expect((await endpoint(request())).status).toBe(403);
  session.authContext.identity.links[0]!.role = "paciente";
  session.patientId = clinicId;
  expect((await endpoint(request())).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
});
it("rejects cross-owner data, out-of-range records and invalid cursors or ordering", () => {
  const scope = { clinicId, patientId };
  for (const bad of [
    { ...page, patientId: clinicId },
    { ...page, records: [{ ...record, patientId: clinicId }] },
    { ...page, records: [{ ...record, occurredAt: query.until }] },
    { ...page, records: [record, record] },
    { ...page, nextCursor: id },
    { ...page, actor: "private" },
    { ...page, from: "2026-10-29T00:00:00.000001Z" },
  ])
    expect(() => validateHydrationPage(bad, scope, query)).toThrow();
  expect(() => validateHydrationPage(page, scope, { ...query, after: id })).toThrow();
});
it("does not leak malformed upstream clinical data through errors", async () => {
  const { endpoint, read } = setup();
  read.mockResolvedValueOnce({ ...page, records: [{ ...record, actor_user_id: "private-user" }] });
  const r = await endpoint(request());
  expect(r.status).toBe(503);
  expect(JSON.stringify(await r.json())).not.toContain("private-user");
});
import { createHydrationListClient } from "@/features/hydration/list-client";
it("client sends fresh bearer per page without scope in query or browser cache", async () => {
  const token = vi.fn().mockResolvedValueOnce("one").mockResolvedValueOnce("two"),
    fetcher = vi.fn<typeof fetch>(async () => Response.json({ page }));
  const client = createHydrationListClient(token, fetcher),
    scope = { clinicId, patientId };
  await client(query, scope);
  await client(query, scope);
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    headers: { Authorization: "Bearer one" },
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
  });
  expect(fetcher.mock.calls[1]![1]?.headers).toEqual({ Authorization: "Bearer two" });
  expect(String(fetcher.mock.calls[0]![0])).not.toContain(clinicId);
  expect(String(fetcher.mock.calls[0]![0])).not.toContain(patientId);
  await expect(createHydrationListClient(async () => null, fetcher)(query, scope)).rejects.toThrow(
    "Session required",
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
  token.mockResolvedValue("three");
  fetcher.mockResolvedValueOnce(Response.json({ page: { ...page, patientId: clinicId } }));
  await expect(client(query, scope)).rejects.toThrow();
});
