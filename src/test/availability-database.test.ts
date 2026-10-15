import { createAvailabilityReadEndpoint } from "@/lib/agenda/availability-read-endpoint.server";
// @vitest-environment node
import { createAvailabilitySqlReader } from "@/lib/agenda/availability-sql-reader.server";
import { readOwnAvailability } from "@/lib/agenda/availability-read.server";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, expect, it } from "vitest";
import { createAvailabilityClient } from "@/features/agenda/availability-client";
import { createAvailabilityEndpoint } from "@/lib/agenda/availability-endpoint.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
const clinic = "11111111-1111-4111-8111-111111111111",
  doctor = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333",
  requestId = "44444444-4444-4444-8444-444444444444";
let db: PGlite;
async function as(user: string) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("SET ROLE authenticated");
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;",
  );
  for (const file of ["001_tenant_foundation.sql", "015_doctor_availability.sql"])
    await db.exec(
      await readFile(new URL(`../../database/migrations/${file}`, import.meta.url), "utf8"),
    );
  await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'QA',true)", [clinic]);
  await db.query(
    "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,medical_identity_verified) VALUES($1,$2,$1,'medico',true,true)",
    [doctor, clinic],
  );
  await db.query(
    "INSERT INTO public.tm_membership_grants VALUES($1,'agenda','write'),($1,'agenda','read')",
    [doctor],
  );
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [other],
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function create(
  id = requestId,
  start = "2026-10-15T12:00:00Z",
  end = "2026-10-15T13:00:00Z",
  owner = clinic,
) {
  return db.query<{ value: { id: string; doctor_user_id: string } }>(
    "SELECT public.tm_create_own_availability($1,$2,$3,$4) AS value",
    [owner, id, start, end],
  );
}
it("creates own interval and replays without duplicate", async () => {
  await as(doctor);
  const first = await create();
  expect((await create()).rows).toEqual(first.rows);
  expect(first.rows[0]?.value.doctor_user_id).toBe(doctor);
  expect((await db.query("SELECT * FROM public.tm_doctor_availability")).rows).toHaveLength(1);
  await expect(db.exec("DELETE FROM public.tm_doctor_availability")).rejects.toMatchObject({
    code: "42501",
  });
});
it("overlap and changed replay conflict; adjacent slot is allowed", async () => {
  await as(doctor);
  await expect(create(other, "2026-10-15T12:30:00Z", "2026-10-15T13:30:00Z")).rejects.toMatchObject(
    { code: "23505" },
  );
  await expect(
    create(requestId, "2026-10-15T14:00:00Z", "2026-10-15T15:00:00Z"),
  ).rejects.toMatchObject({ code: "23505" });
  await create(other, "2026-10-15T13:00:00Z", "2026-10-15T14:00:00Z");
});
it("global operator and foreign clinic cannot create/read own doctor schedule", async () => {
  await as(other);
  await expect(create()).rejects.toMatchObject({ code: "42501" });
  expect((await db.query("SELECT * FROM public.tm_doctor_availability")).rows).toHaveLength(0);
  await as(doctor);
  await expect(create(requestId, undefined, undefined, other)).rejects.toMatchObject({
    code: "42501",
  });
});
it("revoked write grant denies replay without removing intervals", async () => {
  await db.exec("RESET ROLE");
  await db.query(
    "DELETE FROM public.tm_membership_grants WHERE membership_id=$1 AND action='write'",
    [doctor],
  );
  await as(doctor);
  await expect(create()).rejects.toMatchObject({ code: "42501" });
  expect((await db.query("SELECT * FROM public.tm_doctor_availability")).rows).toHaveLength(2);
});
it("client-host-session-HTTP-SQL recovers a committed response without duplicate", async () => {
  await db.exec("RESET ROLE");
  await db.query("INSERT INTO public.tm_membership_grants VALUES($1,'agenda','write')", [doctor]);
  const identity: AuthenticatedIdentity = {
    userId: doctor,
    links: [
      {
        clinicId: clinic,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: [{ resource: "agenda", action: "write" }],
      },
    ],
  };
  const endpoint = createAvailabilityEndpoint({
    lookup: async (hostname) => ({
      hostname,
      clinicId: clinic,
      environment: "clinic_portal",
      status: "active",
    }),
    resolveSession: async (request) =>
      request.headers.get("authorization") === "Bearer qa" ? { identity } : null,
    rpc: () => async (args) => {
      await as(doctor);
      try {
        const result = await db.query<{ value: unknown }>(
          "SELECT public.tm_create_own_availability($1,$2,$3,$4) AS value",
          [args.p_clinic_id, args.p_source_request_id, args.p_starts_at, args.p_ends_at],
        );
        return { data: result.rows[0]?.value, error: null };
      } catch (error) {
        return { data: null, error: { code: (error as { code: string }).code } };
      }
    },
  });
  let loseResponse = true;
  const client = createAvailabilityClient(
    { clinicId: clinic, doctorUserId: doctor, getAccessToken: async () => "qa" },
    async (url, options) => {
      const response = await endpoint(
        new Request(`https://clinic.example.com${String(url)}`, {
          ...options,
          headers: { ...options?.headers, host: "clinic.example.com" },
        }),
      );
      if (loseResponse) {
        loseResponse = false;
        throw new Error("Response lost after commit");
      }
      return response;
    },
  );
  const input = {
    sourceRequestId: "55555555-5555-4555-8555-555555555555",
    interval: { startsAt: "2026-10-15T15:00:00-03:00", endsAt: "2026-10-15T16:00:00-03:00" },
  };
  await expect(client(input)).rejects.toThrow("Response lost after commit");
  const receipt = await client(input);
  expect(receipt.doctorUserId).toBe(doctor);
  expect(
    (
      await db.query("SELECT id FROM public.tm_doctor_availability WHERE source_request_id=$1", [
        input.sourceRequestId,
      ])
    ).rows,
  ).toEqual([{ id: receipt.id }]);
});

it("pages own availability through SQL and applies read revocation under RLS", async () => {
  await as(doctor);
  const identity: AuthenticatedIdentity = {
    userId: doctor,
    links: [
      {
        clinicId: clinic,
        role: "medico",
        isActive: true,
        medicalIdentityVerified: true,
        grants: [{ resource: "agenda", action: "read" }],
      },
    ],
  };
  const context = { currentClinicId: clinic, identity };
  const reader = createAvailabilitySqlReader(doctor, (sql, params) => db.query(sql, params));
  const readEndpoint = createAvailabilityReadEndpoint({
    lookup: async (hostname) => ({
      hostname,
      clinicId: clinic,
      environment: "clinic_portal",
      status: "active",
    }),
    resolveSession: async () => ({ identity }),
    reader: () => reader,
  });
  const httpRead = () =>
    readEndpoint(
      new Request(
        "https://clinic.example.com/api/agenda/availability?start=2026-10-15T00%3A00%3A00Z&end=2026-10-16T00%3A00%3A00Z&limit=1",
        { headers: { host: "clinic.example.com" } },
      ),
    );
  const httpPage = await httpRead();
  expect(httpPage.status).toBe(200);
  expect((await httpPage.json()).page.items).toHaveLength(1);
  const query = {
    window: { startsAt: "2026-10-15T00:00:00Z", endsAt: "2026-10-16T00:00:00Z" },
    limit: 1,
  };
  const ids: string[] = [];
  let after: { startsAt: string; id: string } | undefined;
  do {
    const page = await readOwnAvailability(
      context,
      { ...query, ...(after ? { after } : {}) },
      reader,
    );
    ids.push(...page.items.map((item) => item.id));
    after = page.next ?? undefined;
  } while (after && ids.length < 10);
  expect(ids).toHaveLength(3);
  expect(new Set(ids).size).toBe(3);
  await as(other);
  expect((await readOwnAvailability(context, query, reader)).items).toEqual([]);
  await db.exec("RESET ROLE");
  await db.query(
    "DELETE FROM public.tm_membership_grants WHERE membership_id=$1 AND action='read'",
    [doctor],
  );
  await as(doctor);
  expect((await readOwnAvailability(context, query, reader)).items).toEqual([]);
  expect((await (await httpRead()).json()).page.items).toEqual([]);
});
