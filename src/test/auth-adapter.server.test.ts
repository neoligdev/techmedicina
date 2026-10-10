import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveSupabaseSession } from "../lib/auth/supabase-adapter.server";
import { createGuardFactory } from "../lib/auth/guards.server";
import * as serverRuntime from "@tanstack/react-start/server";
import * as supabaseJs from "@supabase/supabase-js";

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

describe("Server-only Auth Adapter", () => {
  const mockGetRequest = vi.mocked(serverRuntime.getRequest);
  const mockCreateClient = vi.mocked(supabaseJs.createClient);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SUPABASE_URL", "https://mock.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "mock-anon-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return null if config is absent", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
    const session = await resolveSupabaseSession();
    expect(session).toBeNull();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("should return null and reject secret key as publishable", async () => {
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_secret_123");
    const session = await resolveSupabaseSession();
    expect(session).toBeNull();
  });

  it("should return null if getRequest throws", async () => {
    mockGetRequest.mockImplementation(() => {
      throw new Error("Out of context");
    });
    const session = await resolveSupabaseSession();
    expect(session).toBeNull();
  });

  it("should return null if header is missing", async () => {
    mockGetRequest.mockReturnValue({ headers: new Headers() } as unknown as Request);
    const session = await resolveSupabaseSession();
    expect(session).toBeNull();
  });

  it("should return null if token is malformed", async () => {
    mockGetRequest.mockReturnValue({
      headers: new Headers({ authorization: "Bearer invalid_token" }),
    } as unknown as Request);
    const session = await resolveSupabaseSession();
    expect(session).toBeNull();
  });

  it("should return null if createClient throws", async () => {
    mockGetRequest.mockReturnValue({
      headers: new Headers({ authorization: "Bearer a.b.c" }),
    } as unknown as Request);
    mockCreateClient.mockImplementation(() => {
      throw new Error("createClient failed");
    });
    const session = await resolveSupabaseSession();
    expect(session).toBeNull();
  });

  it("should return null if getUser throws", async () => {
    mockGetRequest.mockReturnValue({
      headers: new Headers({ authorization: "Bearer a.b.c" }),
    } as unknown as Request);
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error("Network Error")),
      },
    } as unknown as ReturnType<typeof supabaseJs.createClient>);

    const session = await resolveSupabaseSession();
    expect(session).toBeNull();
  });

  it("should return null if token is invalid according to provider", async () => {
    mockGetRequest.mockReturnValue({
      headers: new Headers({ authorization: "Bearer a.b.c" }),
    } as unknown as Request);
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: new Error("invalid token") }),
      },
    } as unknown as ReturnType<typeof supabaseJs.createClient>);

    const session = await resolveSupabaseSession();
    expect(session).toBeNull();
  });

  it("should return valid subject but with empty links, ignoring forged metadata", async () => {
    mockGetRequest.mockReturnValue({
      headers: new Headers({ authorization: "Bearer a.b.c" }),
    } as unknown as Request);
    const mockGetUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          user_metadata: { role: "super_admin" },
          app_metadata: { role: "super_admin" },
        },
      },
      error: null,
    });
    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser },
    } as unknown as ReturnType<typeof supabaseJs.createClient>);

    const session = await resolveSupabaseSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-123");
    expect(session?.links).toEqual([]);
    expect(session?.globalRole).toBeUndefined();
    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }),
    );
    expect(mockGetUser).toHaveBeenCalledWith("a.b.c");
  });

  it("should test requireAuth 401 without session and clinic client without access 403", async () => {
    const sessionResolver = async () => ({
      userId: "user-123",
      links: [],
    });

    const guards = createGuardFactory(sessionResolver, async () => undefined);

    await expect(
      guards.requirePermission("prontuario", "read", "clinic-sent-by-client"),
    ).rejects.toThrow("403: Forbidden");

    const noSessionResolver = async () => null;
    const strictGuards = createGuardFactory(noSessionResolver, async () => undefined);
    await expect(strictGuards.requireAuth("any")).rejects.toThrow("401: Unauthorized");
  });

  it("loads persisted identity only after remote user confirmation", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { userId, globalRole: "super_admin", links: [] }, error: null });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mockGetRequest.mockReturnValue(
      new Request("https://local.test", { headers: { Authorization: "Bearer a.b.c" } }),
    );
    mockCreateClient.mockReturnValue({ auth: { getUser }, rpc } as unknown as ReturnType<
      typeof supabaseJs.createClient
    >);
    expect(await resolveSupabaseSession()).toEqual({
      userId,
      globalRole: "super_admin",
      links: [],
    });
    expect(rpc).toHaveBeenCalledWith("tm_resolve_identity");
    expect(getUser.mock.invocationCallOrder[0]!).toBeLessThan(rpc.mock.invocationCallOrder[0]!);
  });

  it.each(["error", "throw", "different-user"])(
    "database failure cannot create privileges: %s",
    async (failure) => {
      const userId = "00000000-0000-4000-8000-000000000001";
      const rpc = vi.fn();
      if (failure === "throw") rpc.mockRejectedValue(new Error("secret database details"));
      else
        rpc.mockResolvedValue({
          data: {
            userId: "00000000-0000-4000-8000-000000000002",
            globalRole: "super_admin",
            links: [],
          },
          error: failure === "error" ? new Error("missing migration") : null,
        });
      mockGetRequest.mockReturnValue(
        new Request("https://local.test", { headers: { Authorization: "Bearer a.b.c" } }),
      );
      mockCreateClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
        },
        rpc,
      } as unknown as ReturnType<typeof supabaseJs.createClient>);
      expect(await resolveSupabaseSession()).toEqual({ userId, links: [] });
    },
  );

  it("should enforce factory isolation and concurrent independence", async () => {
    let requestCount = 0;

    type GetUserResult = Awaited<
      ReturnType<ReturnType<typeof supabaseJs.createClient>["auth"]["getUser"]>
    >;
    let resolveFirstGetUser: (v: GetUserResult) => void;
    const firstGetUserPromise = new Promise<GetUserResult>((res) => {
      resolveFirstGetUser = res;
    });
    let resolveSecondGetUser: (v: GetUserResult) => void;
    const secondGetUserPromise = new Promise<GetUserResult>((res) => {
      resolveSecondGetUser = res;
    });

    mockGetRequest.mockImplementation(() => {
      requestCount++;
      const id = requestCount;
      return {
        headers: new Headers({ authorization: `Bearer header.token.${id}` }),
      } as unknown as Request;
    });

    const mockGetUser1 = vi.fn().mockImplementation(() => firstGetUserPromise);
    const mockGetUser2 = vi.fn().mockImplementation(() => secondGetUserPromise);

    const client1 = { auth: { getUser: mockGetUser1 } } as unknown as ReturnType<
      typeof supabaseJs.createClient
    >;
    const client2 = { auth: { getUser: mockGetUser2 } } as unknown as ReturnType<
      typeof supabaseJs.createClient
    >;

    let clientIndex = 0;
    mockCreateClient.mockImplementation(() => {
      clientIndex++;
      return clientIndex === 1 ? client1 : client2;
    });

    const sessionPromise1 = resolveSupabaseSession();
    const sessionPromise2 = resolveSupabaseSession();

    resolveFirstGetUser!({
      data: {
        user: {
          id: "user-for-header.token.1",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: "2026-10-10T00:00:00.000Z",
        },
      },
      error: null,
    });
    resolveSecondGetUser!({
      data: {
        user: {
          id: "user-for-header.token.2",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: "2026-10-10T00:00:00.000Z",
        },
      },
      error: null,
    });

    const [session1, session2] = await Promise.all([sessionPromise1, sessionPromise2]);

    expect(session1?.userId).toBe("user-for-header.token.1");
    expect(session2?.userId).toBe("user-for-header.token.2");
    expect(session1?.userId).not.toBe(session2?.userId);
    expect(mockCreateClient).toHaveBeenCalledTimes(2);
    expect(mockGetUser1).toHaveBeenCalledWith("header.token.1");
    expect(mockGetUser2).toHaveBeenCalledWith("header.token.2");
    expect(client1).not.toBe(client2);
  });
});
