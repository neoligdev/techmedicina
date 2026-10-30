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
it("receipt lookup uses one verified bearer and derives tenant from host rather than query", async () => {
  const { run, rpc, resolveSession } = setup();
  const implementation = rpc.getMockImplementation()!;
  rpc.mockImplementation((session, name, args) =>
    name === "tm_get_own_hydration_receipt"
      ? Promise.resolve({ clinicId: clinic, patientId: patient, record: null, receipt: null })
      : implementation(session, name, args),
  );
  const suffix = "?recordId=" + user + "&sourceRequestId=" + patient;
  const result = await run("receipt", request("receipt", "app.clinica.example", suffix));
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({
    result: { clinicId: clinic, patientId: patient, record: null, receipt: null },
  });
  expect(resolveSession).toHaveBeenCalledTimes(1);
  expect(rpc.mock.calls[0]![0]).toBe(rpc.mock.calls[1]![0]);
  expect(rpc.mock.calls[1]!.slice(1)).toEqual([
    "tm_get_own_hydration_receipt",
    { p_clinic_id: clinic, p_record_id: user, p_source_request_id: patient },
  ]);
  expect(result.headers.get("cache-control")).toBe("private, no-store");
  expect(result.headers.get("vary")).toBe("Authorization, Host");
});
it("rejects receipt query scope, duplicates, missing identifiers and writes before RPC", async () => {
  const { run, rpc } = setup();
  for (const suffix of [
    "",
    "?recordId=" + user,
    "?recordId=" + user + "&sourceRequestId=" + patient + "&clinicId=" + clinic,
    "?recordId=" + user + "&recordId=" + user + "&sourceRequestId=" + patient,
  ])
    expect((await run("receipt", request("receipt", "app.clinica.example", suffix))).status).toBe(
      400,
    );
  expect(
    (
      await run(
        "receipt",
        new Request("https://app.clinica.example/api/hydration/receipt", {
          method: "POST",
          body: "{}",
        }),
      )
    ).status,
  ).toBe(405);
  expect(rpc).not.toHaveBeenCalled();
});
it("does not release foreign or malformed receipt responses", async () => {
  const { run, rpc } = setup();
  const implementation = rpc.getMockImplementation()!;
  for (const bad of [
    { clinicId: clinic, patientId: user, record: null, receipt: null },
    { clinicId: clinic, patientId: patient, record: null, receipt: null, actor: "internal" },
  ]) {
    rpc.mockImplementation((session, name, args) =>
      name === "tm_get_own_hydration_receipt"
        ? Promise.resolve(bad)
        : implementation(session, name, args),
    );
    const result = await run(
      "receipt",
      request(
        "receipt",
        "app.clinica.example",
        "?recordId=" + user + "&sourceRequestId=" + patient,
      ),
    );
    expect(result.status).toBe(503);
    expect(JSON.stringify(await result.json())).not.toContain("internal");
  }
});
it("recovery client only reads and verifies the original command after a lost response", async () => {
  const { createHydrationRecoveryClient } = await import("@/features/hydration/recovery-client");
  const command = {
    kind: "create",
    recordId: user,
    sourceRequestId: patient,
    expectedRevision: 0,
    document: { volumeMl: 250, occurredAt: "2026-10-30T12:00:00Z" },
  };
  const record = {
    id: user,
    clinicId: clinic,
    patientId: patient,
    revision: 1,
    status: "active",
    ...command.document,
  };
  const raw = {
    clinicId: clinic,
    patientId: patient,
    record,
    receipt: { scope: { clinicId: clinic, patientId: patient }, command, record },
  };
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({ result: raw }));
  const read = createHydrationRecoveryClient(async () => "qa", fetcher);
  expect((await read(command, { clinicId: clinic, patientId: patient })).confirmation).toBe(
    "confirmed",
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]![0]).not.toContain("clinicId");
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    method: "GET",
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    headers: { Authorization: "Bearer qa" },
  });
  await expect(
    read(
      { ...command, document: { ...command.document, volumeMl: 999 } },
      { clinicId: clinic, patientId: patient },
    ),
  ).rejects.toThrow();
  fetcher.mockResolvedValueOnce(Response.json({ error: "private" }, { status: 403 }));
  await expect(read(command, { clinicId: clinic, patientId: patient })).rejects.toThrow(
    "unavailable",
  );
  expect(fetcher).toHaveBeenCalledTimes(3);
  fetcher.mockClear();
  await expect(
    createHydrationRecoveryClient(async () => null, fetcher)(command, {
      clinicId: clinic,
      patientId: patient,
    }),
  ).rejects.toThrow("Session required");
  expect(fetcher).not.toHaveBeenCalled();
});
it("receipt lookup rechecks host and read grants before touching receipt storage", async () => {
  const { run, rpc, identity } = setup();
  const suffix = "?recordId=" + user + "&sourceRequestId=" + patient;
  expect((await run("receipt", request("receipt", "localhost", suffix))).status).toBe(403);
  expect(rpc).not.toHaveBeenCalled();
  identity.links[0]!.grants = [];
  expect((await run("receipt", request("receipt", "app.clinica.example", suffix))).status).toBe(
    403,
  );
  expect(rpc.mock.calls.every((c) => c[1] === "tm_resolve_patient_hydration_host")).toBe(true);
});
const hydrationWrite = {
  kind: "create",
  recordId: user,
  sourceRequestId: patient,
  expectedRevision: 0,
  document: { volumeMl: 250, occurredAt: "2026-10-30T12:00:00Z" },
};
const postHydration = (value: unknown = hydrationWrite, extra = "") =>
  new Request("https://app.clinica.example/api/hydration/mutate" + extra, {
    method: "POST",
    headers: { host: "app.clinica.example", "content-type": "application/json" },
    body: JSON.stringify(value),
  });
it("hydration writes require explicit create/write plus read grants", async () => {
  const { run, identity, rpc } = setup();
  expect((await run("mutate", postHydration())).status).toBe(403);
  identity.links[0]!.grants.push({ resource: "hydration_records", action: "create" });
  const implementation = rpc.getMockImplementation()!;
  const record = {
    id: user,
    clinicId: clinic,
    patientId: patient,
    revision: 1,
    status: "active",
    ...hydrationWrite.document,
  };
  rpc.mockImplementation((session, name, args) =>
    name === "tm_mutate_own_hydration_record"
      ? Promise.resolve({
          receipt: {
            scope: { clinicId: clinic, patientId: patient },
            command: args["p_command"],
            record,
          },
          record,
          replayed: false,
        })
      : implementation(session, name, args),
  );
  const response = await run("mutate", postHydration());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    result: { record: { revision: 1 }, replayed: false },
  });
  const calls = rpc.mock.calls.slice(-2);
  expect(calls[0]![0]).toBe(calls[1]![0]);
  expect(calls[1]![2]).toEqual({ p_clinic_id: clinic, p_command: hydrationWrite });
  expect(
    (
      await run(
        "mutate",
        postHydration({ ...hydrationWrite, kind: "correct", expectedRevision: 1 }),
      )
    ).status,
  ).toBe(403);
  identity.links[0]!.grants = [{ resource: "hydration_records", action: "create" }];
  expect((await run("mutate", postHydration())).status).toBe(403);
});
it("hydration write rejects caller scope, excessive body and query before any RPC", async () => {
  const { run, rpc } = setup();
  expect((await run("mutate", postHydration({ ...hydrationWrite, clinicId: clinic }))).status).toBe(
    400,
  );
  expect((await run("mutate", postHydration(hydrationWrite, "?patientId=" + patient))).status).toBe(
    400,
  );
  expect((await run("mutate", postHydration({ extra: "x".repeat(5000) }))).status).toBe(413);
  expect(
    (
      await run(
        "mutate",
        new Request("https://app.clinica.example/api/hydration/mutate", {
          method: "POST",
          body: "{}",
        }),
      )
    ).status,
  ).toBe(415);
  expect(rpc).not.toHaveBeenCalled();
});
it("hydration write exposes conflict but hides unknown/invalid upstream outcomes", async () => {
  const { run, identity, rpc } = setup();
  identity.links[0]!.grants.push({ resource: "hydration_records", action: "create" });
  const implementation = rpc.getMockImplementation()!;
  const { AuthError } = await import("@/lib/auth/guards.server");
  for (const failure of [new AuthError("private conflict", 409), new Error("secret upstream")]) {
    rpc.mockImplementation((session, name, args) =>
      name === "tm_mutate_own_hydration_record"
        ? Promise.reject(failure)
        : implementation(session, name, args),
    );
    const response = await run("mutate", postHydration());
    expect(response.status).toBe(failure instanceof AuthError ? 409 : 503);
    expect(JSON.stringify(await response.json())).not.toMatch(/private conflict|secret upstream/);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  }
  rpc.mockImplementation((session, name, args) =>
    name === "tm_mutate_own_hydration_record"
      ? Promise.resolve({ receipt: null, record: null, replayed: false })
      : implementation(session, name, args),
  );
  expect((await run("mutate", postHydration())).status).toBe(503);
});
it("mutation client never retries an uncertain write or substitutes the original command", async () => {
  const { createHydrationMutationClient, HydrationWriteError } =
    await import("@/features/hydration/mutation-client");
  const fetcher = vi.fn<typeof fetch>(async () => {
    throw new Error("connection lost after commit");
  });
  const send = createHydrationMutationClient(async () => "qa", fetcher);
  await expect(
    send(hydrationWrite, { clinicId: clinic, patientId: patient }),
  ).rejects.toMatchObject({ outcome: "uncertain" });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toEqual(hydrationWrite);
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    method: "POST",
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
  });
  for (const [status, outcome] of [
    [409, "conflict"],
    [403, "rejected"],
    [503, "uncertain"],
  ] as const) {
    fetcher.mockResolvedValueOnce(Response.json({ error: "private" }, { status }));
    await expect(
      send(hydrationWrite, { clinicId: clinic, patientId: patient }),
    ).rejects.toMatchObject({ outcome, status });
  }
  fetcher.mockResolvedValueOnce(
    Response.json({ result: { receipt: null, record: null, replayed: false } }),
  );
  await expect(
    send(hydrationWrite, { clinicId: clinic, patientId: patient }),
  ).rejects.toBeInstanceOf(HydrationWriteError);
  fetcher.mockClear();
  await expect(
    createHydrationMutationClient(async () => null, fetcher)(hydrationWrite, {
      clinicId: clinic,
      patientId: patient,
    }),
  ).rejects.toMatchObject({ outcome: "rejected", status: 401 });
  expect(fetcher).not.toHaveBeenCalled();
});
it("preferences endpoint derives own scope and requires write, with no caller authority", async () => {
  const { run, rpc, identity, resolveSession } = setup();
  const implementation = rpc.getMockImplementation()!;
  const settings = {
    dailyGoalMl: null,
    timeZone: "UTC",
    remindersEnabled: false,
    reminderTimes: [],
  };
  const command = { sourceRequestId: user, expectedRevision: 0, settings };
  const snapshot = { clinicId: clinic, patientId: patient, revision: 1, settings };
  rpc.mockImplementation((session, name, args) =>
    name === "tm_get_own_hydration_preferences"
      ? Promise.resolve({ clinicId: clinic, patientId: patient, preferences: null, receipt: null })
      : name === "tm_save_own_hydration_preferences"
        ? Promise.resolve({
            clinicId: clinic,
            patientId: patient,
            preferences: snapshot,
            receipt: { command: args["p_command"], snapshot },
          })
        : implementation(session, name, args),
  );
  expect((await run("preferences", request("preferences"))).status).toBe(200);
  expect(resolveSession).toHaveBeenCalledTimes(1);
  expect(rpc.mock.calls[0]![0]).toBe(rpc.mock.calls[1]![0]);
  const post = () =>
    new Request("https://app.clinica.example/api/hydration/preferences", {
      method: "POST",
      headers: { host: "app.clinica.example", "content-type": "application/json" },
      body: JSON.stringify(command),
    });
  expect((await run("preferences", post())).status).toBe(403);
  identity.links[0]!.grants.push({ resource: "hydration_records", action: "write" });
  const response = await run("preferences", post());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    result: { preferences: { revision: 1, settings } },
  });
  expect(rpc.mock.calls.at(-1)![2]).toEqual({ p_clinic_id: clinic, p_command: command });
  expect(
    (await run("preferences", request("preferences", "app.clinica.example", "?clinicId=" + clinic)))
      .status,
  ).toBe(400);
  expect(
    (
      await run(
        "preferences",
        request(
          "preferences",
          "app.clinica.example",
          "?sourceRequestId=" + user + "&sourceRequestId=" + user,
        ),
      )
    ).status,
  ).toBe(400);
});
