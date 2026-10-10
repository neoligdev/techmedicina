import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ resolve: vi.fn(), request: vi.fn() }));
vi.mock("../lib/auth/supabase-adapter.server", () => ({ resolveSupabaseContext: mocks.resolve }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.request }));
import { clinicBrandingHandlers } from "../lib/admin/clinic-branding-runtime.server";

const clinicId = "00000000-0000-4000-8000-000000000001";
const preferences = { name: "Clínica", primary: "#123456", secondary: "#abcdef", mode: "dark" };
const saved = { clinic_id: clinicId, preferences, revision: 1, updated_at: "2026-10-10T12:00:00Z" };
const input = new Request(`https://example.test/api/platform/branding?clinicId=${clinicId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ clinicId, preferences, expectedRevision: 0 }),
});
describe("Transporte de personalização com sessão validada", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://database.example.test");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_fixture");
    mocks.resolve.mockResolvedValue({
      identity: { userId: "operator", globalRole: "super_admin", links: [] },
    });
    mocks.request.mockReturnValue(
      new Request("https://example.test", { headers: { Authorization: "Bearer fixture-session" } }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });
  it("não chama banco quando a sessão não é confirmada", async () => {
    mocks.resolve.mockResolvedValue(null);
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await clinicBrandingHandlers.GET(input)).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("consulta somente ID validado usando o mesmo bearer e chave pública", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json([saved]));
    vi.stubGlobal("fetch", fetcher);
    expect((await clinicBrandingHandlers.GET(input)).status).toBe(200);
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url.origin).toBe("https://database.example.test");
    expect(url.pathname).toBe("/rest/v1/tm_clinic_branding");
    expect(url.searchParams.get("clinic_id")).toBe(`eq.${clinicId}`);
    expect(options.headers.Authorization).toBe("Bearer fixture-session");
    expect(options.headers.apikey).toBe("sb_publishable_fixture");
    expect(options.redirect).toBe("error");
    expect(options.cache).toBe("no-store");
  });
  it("grava pela RPC sem enviar conta autora ou elevar privilégios", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(saved));
    vi.stubGlobal("fetch", fetcher);
    expect((await clinicBrandingHandlers.PUT(input.clone())).status).toBe(200);
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url.pathname).toBe("/rest/v1/rpc/tm_save_branding");
    expect(JSON.parse(options.body)).toEqual({
      p_clinic_id: clinicId,
      p_preferences: preferences,
      p_expected_revision: 0,
    });
  });
  it.each([
    ["40001", 409],
    ["42501", 403],
    ["22023", 400],
    ["PGRST202", 503],
  ] as const)("mapeia %s sem expor resposta interna", async (code, status) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ code, message: "private SQL details" }, { status: 400 }),
        ),
    );
    const response = await clinicBrandingHandlers.PUT(input.clone());
    expect(response.status).toBe(status);
    expect(await response.text()).not.toContain("private SQL details");
  });
  it("rejeita consulta que devolve mais de uma linha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([saved, saved])));
    expect((await clinicBrandingHandlers.GET(input)).status).toBe(503);
  });
});
