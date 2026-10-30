// @vitest-environment node
import { it, expect, vi } from "vitest";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
import { createPatientHydrationRuntime } from "@/lib/hydration/patient-runtime.server";
import { createOwnHydrationContextClient } from "@/features/hydration/own-context-client";
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
        grants: [{ resource: "hydration_records", action: "read" }],
      },
    ],
  };
  const resolveSession = vi.fn(
    async () =>
      ({ identity, authorization: "Bearer first" }) as {
        identity: AuthenticatedIdentity;
        authorization: string;
      } | null,
  );
  const rpc = vi.fn(
    async (
      session: { identity: AuthenticatedIdentity; authorization: string },
      name: string,
      args: Record<string, unknown>,
    ): Promise<unknown> =>
      name === "tm_resolve_patient_hydration_host"
        ? {
            hostname: args["p_hostname"],
            clinicId: clinic,
            environment: "patient_pwa",
            status: "active",
          }
        : {
            clinicId: clinic,
            patientId: session.identity.links[0]!.patientId,
            from: args["p_from"],
            until: args["p_until"],
            records: [],
            nextCursor: null,
          },
  );
  return {
    identity,
    resolveSession,
    rpc,
    run: createPatientHydrationRuntime({ resolveSession, rpc }),
  };
}
const request = (path = "context", host = "app.clinica.example", extra = "") =>
  new Request("https://" + host + "/api/hydration/" + path + extra, {
    headers: { host, Authorization: "Bearer browser" },
  });
it("returns only own scope and uses hydration-specific RPC rather than Journey grants", async () => {
  const { run, rpc } = setup(),
    r = await run("context", request());
  expect(await r.json()).toEqual({ scope: { clinicId: clinic, patientId: patient } });
  expect(r.headers.get("vary")).toBe("Authorization, Host");
  expect(JSON.stringify(rpc.mock.calls.map((c) => c[1]))).not.toContain("journey");
});
it("uses the same verified session for host and records and never caches the next request", async () => {
  const { run, rpc, resolveSession } = setup();
  const suffix = "?from=2026-10-29T00:00:00Z&until=2026-10-30T00:00:00Z";
  expect((await run("records", request("records", "app.clinica.example", suffix))).status).toBe(
    200,
  );
  expect(resolveSession).toHaveBeenCalledTimes(1);
  expect(rpc.mock.calls).toHaveLength(2);
  expect(rpc.mock.calls[0]![0]).toBe(rpc.mock.calls[1]![0]);
  const second: AuthenticatedIdentity = {
    userId: patient,
    links: [
      {
        clinicId: clinic,
        patientId: user,
        role: "paciente",
        isActive: true,
        grants: [{ resource: "hydration_records", action: "read" }],
      },
    ],
  };
  resolveSession.mockResolvedValueOnce({ identity: second, authorization: "Bearer second" });
  const r = await run("records", request("records", "app.clinica.example", suffix));
  expect((await r.json()).page.patientId).toBe(user);
  expect(resolveSession).toHaveBeenCalledTimes(2);
  expect(rpc.mock.calls[2]![0].authorization).toBe("Bearer second");
});
it("does not substitute Journey read grants and rejects global-only administrators", async () => {
  const { identity, run } = setup();
  identity.links[0]!.grants = [{ resource: "journey_events", action: "read" }];
  expect((await run("context", request())).status).toBe(403);
  identity.links = [];
  identity.globalRole = "super_admin";
  expect((await run("context", request())).status).toBe(403);
});
it("denies local/preview/reserved hosts and spoofed authority before database lookup", async () => {
  const { run, rpc } = setup();
  for (const host of [
    "localhost",
    "127.0.0.1",
    "id-preview--project.lovable.app",
    "admin.example.com",
  ])
    expect((await run("context", request("context", host))).status).toBe(403);
  expect(
    (
      await run(
        "context",
        new Request("https://app.clinica.example/api/hydration/context", {
          headers: { host: "other.clinica.example" },
        }),
      )
    ).status,
  ).toBe(403);
  expect(rpc).not.toHaveBeenCalled();
});
it("rejects missing session, caller scope and suspended registry data", async () => {
  const { run, rpc, resolveSession } = setup();
  expect(
    (await run("context", request("context", "app.clinica.example", "?patientId=" + user))).status,
  ).toBe(400);
  resolveSession.mockResolvedValueOnce(null);
  expect((await run("context", request())).status).toBe(401);
  rpc.mockResolvedValueOnce({
    hostname: "app.clinica.example",
    clinicId: clinic,
    environment: "patient_pwa",
    status: "suspended",
  });
  expect((await run("context", request())).status).toBe(403);
});
it("context client requires fresh token, no cache and a strict response", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ scope: { clinicId: clinic, patientId: patient } }),
  );
  expect(await createOwnHydrationContextClient(async () => "qa", fetcher)()).toEqual({
    clinicId: clinic,
    patientId: patient,
  });
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    headers: { Authorization: "Bearer qa" },
  });
  fetcher.mockClear();
  await expect(createOwnHydrationContextClient(async () => null, fetcher)()).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(
    Response.json({ scope: { clinicId: clinic, patientId: patient, userId: user } }),
  );
  await expect(createOwnHydrationContextClient(async () => "qa", fetcher)()).rejects.toThrow();
});
