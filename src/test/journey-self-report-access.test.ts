// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createSelfReportAccessClient } from "@/features/journey/self-report-access-client";
const scope = {
  clinicId: "11111111-1111-4111-8111-111111111111",
  patientId: "22222222-2222-4222-8222-222222222222",
  getAccessToken: async () => "qa",
};
const body = {
  preference: {
    clinicId: scope.clinicId,
    patientId: scope.patientId,
    isEnabled: true,
    revision: 1,
  },
  canSubmit: true,
};
it("uses fresh bearer and strict same-scope response without storing clinical data", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
  expect(await createSelfReportAccessClient(scope, fetcher)()).toEqual(body);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/journey/self-report-access",
    expect.objectContaining({
      headers: { Authorization: "Bearer qa" },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    }),
  );
});
it("rejects foreign scope, extra identity and enabled capability with paused participation", async () => {
  for (const wrong of [
    { ...body, preference: { ...body.preference, patientId: scope.clinicId } },
    { ...body, actor: "private" },
    { ...body, preference: { ...body.preference, isEnabled: false } },
  ]) {
    await expect(
      createSelfReportAccessClient(scope, async () => Response.json(wrong))(),
    ).rejects.toThrow();
  }
});
it("missing session never fetches and denied HTTP never yields availability", async () => {
  const fetcher = vi.fn<typeof fetch>();
  await expect(
    createSelfReportAccessClient({ ...scope, getAccessToken: async () => null }, fetcher)(),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  await expect(
    createSelfReportAccessClient(scope, async () => new Response(null, { status: 403 }))(),
  ).rejects.toThrow();
});
