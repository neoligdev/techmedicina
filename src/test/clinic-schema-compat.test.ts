import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resolveSupabaseContext } from "@/lib/auth/supabase-adapter.server";
import { listPlatformClinics } from "@/lib/admin/clinic-directory.server";
import { clinicDetailResponse } from "@/lib/admin/clinic-detail.server";
import { writePlatformClinic } from "@/lib/admin/clinic-write.server";
vi.mock("@/lib/auth/supabase-adapter.server", () => ({ resolveSupabaseContext: vi.fn() }));
const id = "11111111-1111-4111-8111-111111111111";
const saved = {
  id,
  name: "QA Clinic",
  is_active: false,
  created_at: "2026-10-21T00:00:00Z",
  revision: 1,
};
const select = vi.fn(),
  rpc = vi.fn();
let supported = false;
let failure: { code: string } | null = null;
beforeEach(() => {
  vi.resetAllMocks();
  supported = false;
  failure = null;
  const client = {
    from: () => ({
      select: (columns: string) => {
        select(columns);
        const result = {
          data: supported ? { ...saved, time_zone: "America/Bahia" } : saved,
          error:
            failure ?? (!supported && columns.includes("time_zone") ? { code: "42703" } : null),
        };
        const builder = {
          eq: () => builder,
          order: () => builder,
          limit: () => builder,
          or: () => builder,
          maybeSingle: async () => result,
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve(
              resolve({
                ...result,
                data: [
                  {
                    id,
                    name: saved.name,
                    is_active: false,
                    created_at: saved.created_at,
                    ...(supported ? { time_zone: "America/Bahia" } : {}),
                  },
                ],
              }),
            ),
        };
        return builder;
      },
    }),
    rpc,
  };
  vi.mocked(resolveSupabaseContext).mockResolvedValue({
    identity: { userId: id, globalRole: "super_admin", links: [] },
    client,
  } as unknown as NonNullable<Awaited<ReturnType<typeof resolveSupabaseContext>>>);
  rpc.mockImplementation(async (_name, args) =>
    supported || !Object.hasOwn(args, "p_time_zone")
      ? { data: supported ? { ...saved, time_zone: args.p_time_zone ?? null } : saved, error: null }
      : { data: null, error: { code: "PGRST202" } },
  );
});
afterEach(() => vi.restoreAllMocks());
const detail = () =>
  clinicDetailResponse(new Request(`https://qa.test/api/platform/clinic?id=${id}`));
const write = (timeZone?: string | null) =>
  writePlatformClinic(
    new Request("https://qa.test/api/platform/clinic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operation: "create",
        name: saved.name,
        isActive: false,
        ...(timeZone !== undefined ? { timeZone } : {}),
      }),
    }),
  );
it("old schema reads omit unavailable timezone without fabricating a value", async () => {
  expect((await listPlatformClinics()).clinics[0]).not.toHaveProperty("time_zone");
  expect(select.mock.calls).toHaveLength(2);
  expect(select.mock.calls[1]?.[0]).not.toContain("time_zone");
  select.mockClear();
  expect(await (await detail()).json()).toEqual({ clinic: saved });
  expect(select.mock.calls).toHaveLength(2);
});
it("new schema reads preserve actual timezone without extra query", async () => {
  supported = true;
  expect((await listPlatformClinics()).clinics[0]?.time_zone).toBe("America/Bahia");
  expect(select).toHaveBeenCalledTimes(1);
  select.mockClear();
  expect((await (await detail()).json()).clinic.time_zone).toBe("America/Bahia");
  expect(select).toHaveBeenCalledTimes(1);
});
it.each(["42501", "08006", "PGRST301"])(
  "error %s is not downgraded to schema compatibility",
  async (code) => {
    failure = { code };
    await expect(listPlatformClinics()).rejects.toThrow();
    expect(select).toHaveBeenCalledTimes(1);
  },
);
it.each([undefined, null])(
  "old RPC receives no unsupported argument when timezone is %s",
  async (timeZone) => {
    expect((await write(timeZone)).status).toBe(201);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty("p_time_zone");
  },
);
it("explicit timezone on old RPC fails once and never retries dropping the request", async () => {
  expect((await write("America/Bahia")).status).toBe(503);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc.mock.calls[0]?.[1].p_time_zone).toBe("America/Bahia");
});
it("new RPC receives and confirms explicit timezone", async () => {
  supported = true;
  const response = await write("America/Bahia");
  expect(response.status).toBe(201);
  expect((await response.json()).clinic.time_zone).toBe("America/Bahia");
  expect(rpc).toHaveBeenCalledTimes(1);
});

it("does not confirm a successful RPC that omitted the requested timezone", async () => {
  rpc.mockResolvedValueOnce({ data: saved, error: null });
  expect((await write("America/Bahia")).status).toBe(503);
  expect(rpc).toHaveBeenCalledTimes(1);
});
