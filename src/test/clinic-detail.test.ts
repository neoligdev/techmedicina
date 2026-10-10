import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clinicDetailResponse } from "../lib/admin/clinic-detail.server";
import { resolveSupabaseContext } from "../lib/auth/supabase-adapter.server";
vi.mock("../lib/auth/supabase-adapter.server", () => ({ resolveSupabaseContext: vi.fn() }));
const id = "00000000-0000-4000-8000-000000000001";
const clinic = {
  id,
  name: "Clínica real",
  is_active: false,
  created_at: "2026-10-10T12:00:00Z",
  revision: 2,
};
const query = { from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
function operator() {
  vi.mocked(resolveSupabaseContext).mockResolvedValue({
    identity: { userId: id, globalRole: "super_admin", links: [] },
    client: query,
  } as unknown as NonNullable<Awaited<ReturnType<typeof resolveSupabaseContext>>>);
}
const request = (value = id) =>
  new Request(`https://local.test/api/platform/clinic?id=${encodeURIComponent(value)}`);
beforeEach(() => {
  vi.resetAllMocks();
  query.from.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data: clinic, error: null });
});
afterEach(() => {
  vi.resetAllMocks();
});
describe("Leitura da versão administrativa", () => {
  it("nega anônimo e conta local antes de consultar identificador", async () => {
    vi.mocked(resolveSupabaseContext).mockResolvedValue(null);
    expect((await clinicDetailResponse(request())).status).toBe(401);
    vi.mocked(resolveSupabaseContext).mockResolvedValue({
      identity: { userId: id, links: [] },
      client: query,
    } as unknown as NonNullable<Awaited<ReturnType<typeof resolveSupabaseContext>>>);
    expect((await clinicDetailResponse(request())).status).toBe(403);
    expect(query.from).not.toHaveBeenCalled();
  });
  it("valida ID e consulta exclusivamente a clínica solicitada sem cache", async () => {
    operator();
    expect((await clinicDetailResponse(request("invalid"))).status).toBe(400);
    expect(query.from).not.toHaveBeenCalled();
    const response = await clinicDetailResponse(request());
    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith("id", id);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ clinic });
  });
  it("não expõe erro de banco nem retorna clínica diferente", async () => {
    operator();
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "private details" } });
    const failed = await clinicDetailResponse(request());
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("private details");
    query.maybeSingle.mockResolvedValueOnce({
      data: { ...clinic, id: "00000000-0000-4000-8000-000000000002" },
      error: null,
    });
    expect((await clinicDetailResponse(request())).status).toBe(503);
  });
  it("ausência é 404 e formato antigo sem revisão é indisponível", async () => {
    operator();
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await clinicDetailResponse(request())).status).toBe(404);
    query.maybeSingle.mockResolvedValueOnce({
      data: { id, name: clinic.name, is_active: false, created_at: clinic.created_at },
      error: null,
    });
    expect((await clinicDetailResponse(request())).status).toBe(503);
  });
});
