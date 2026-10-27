// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { createOwnJourneyContextEndpoint } from "@/lib/journey/own-context-endpoint.server";
import { createOwnJourneyContextClient } from "@/features/journey/own-context-client";
const clinic = "11111111-1111-4111-8111-111111111111",
  patient = "22222222-2222-4222-8222-222222222222",
  user = "33333333-3333-4333-8333-333333333333";
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
  const lookup = vi.fn(async (hostname: string) => ({
    hostname,
    clinicId: clinic,
    environment: "patient_pwa",
    status: "active",
  }));
  const resolveSession = vi.fn(
    async () => ({ identity }) as { identity: AuthenticatedIdentity } | null,
  );
  return {
    identity,
    lookup,
    resolveSession,
    endpoint: createOwnJourneyContextEndpoint({ lookup, resolveSession }),
  };
}
const request = (suffix = "", method = "GET") =>
  new Request(`https://app.example.com/api/journey/context${suffix}`, {
    method,
    headers: { host: "app.example.com", Authorization: "Bearer local-qa" },
  });
it("client gets patient UUID from server membership, never Auth UUID or caller scope", async () => {
  const { endpoint } = setup();
  const fetcher = vi.fn<typeof fetch>(async (input, init) =>
    endpoint(
      new Request(new URL(String(input), "https://app.example.com"), {
        ...init,
        headers: { ...init?.headers, host: "app.example.com" },
      }),
    ),
  );
  expect(await createOwnJourneyContextClient(async () => "local-qa", fetcher)()).toEqual({
    clinicId: clinic,
    patientId: patient,
  });
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    credentials: "omit",
    redirect: "error",
    cache: "no-store",
  });
  const response = await endpoint(request());
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.text()).not.toContain(user);
});
it("rejects arbitrary clinic/patient input and mutations before session resolution", async () => {
  const { endpoint, resolveSession } = setup();
  expect((await endpoint(request(`?patientId=${user}`))).status).toBe(400);
  expect((await endpoint(request("", "POST"))).status).toBe(405);
  expect(resolveSession).not.toHaveBeenCalled();
});
it("denies absent session, revoked link/grant and global-only administrator", async () => {
  const { endpoint, identity, resolveSession } = setup();
  resolveSession.mockResolvedValueOnce(null);
  expect((await endpoint(request())).status).toBe(401);
  identity.links[0]!.grants = [];
  expect((await endpoint(request())).status).toBe(403);
  identity.links = [];
  identity.globalRole = "super_admin";
  expect((await endpoint(request())).status).toBe(403);
});
it("denies other-clinic membership and suspended host", async () => {
  const { endpoint, identity, lookup } = setup();
  identity.links[0]!.clinicId = user;
  expect((await endpoint(request())).status).toBe(403);
  lookup.mockResolvedValueOnce({
    hostname: "app.example.com",
    clinicId: clinic,
    environment: "patient_pwa",
    status: "suspended",
  });
  expect((await endpoint(request())).status).toBe(403);
});
it("does not request without bearer or accept malformed/error context as success", async () => {
  const fetcher = vi.fn<typeof fetch>();
  await expect(createOwnJourneyContextClient(async () => null, fetcher)()).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(
    Response.json({ scope: { clinicId: clinic, patientId: patient, userId: user } }),
  );
  await expect(createOwnJourneyContextClient(async () => "qa", fetcher)()).rejects.toThrow();
  fetcher.mockResolvedValueOnce(Response.json({ error: "private" }, { status: 503 }));
  await expect(createOwnJourneyContextClient(async () => "qa", fetcher)()).rejects.toThrow(
    "unavailable",
  );
});
