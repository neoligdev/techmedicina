import { expect, it, vi } from "vitest";
import {
  createJourneySelfReportClient,
  JourneySelfReportConflict,
} from "../features/journey/self-report-client";
const clinic = "00000000-0000-4000-8000-000000000001",
  patient = "00000000-0000-4000-8000-000000000002",
  id = "00000000-0000-4000-8000-000000000003";
const input = { goalId: id, sourceEventId: id, occurredAt: "2026-10-13T00:00:00Z" };
const receipt = { id, clinicId: clinic, patientId: patient, ...input };
const scope = {
  clinicId: clinic,
  patientId: patient,
  getAccessToken: async () => "local-test-session",
};
it("perda de resposta permite reenvio do mesmo evento sem gerar novo ID", async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce(Response.json({ receipt }));
  const send = createJourneySelfReportClient(scope, fetcher);
  await expect(send(input)).rejects.toThrow();
  expect(await send(input)).toEqual(receipt);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[0]![1].body).toBe(fetcher.mock.calls[1]![1].body);
  expect(fetcher.mock.calls[1]![0]).toBe("/api/journey/self-report");
  expect(fetcher.mock.calls[1]![1]).toMatchObject({
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    headers: { Authorization: "Bearer local-test-session" },
  });
});
it.each(["clinicId", "patientId", "goalId", "sourceEventId"])(
  "recibo com %s trocado é recusado",
  async (field) => {
    const send = createJourneySelfReportClient(scope, async () =>
      Response.json({ receipt: { ...receipt, [field]: "00000000-0000-4000-8000-000000000009" } }),
    );
    await expect(send(input)).rejects.toThrow("Unexpected self-report receipt");
  },
);
it("conflito não retorna recibo e ausência de sessão não envia", async () => {
  await expect(
    createJourneySelfReportClient(scope, async () => new Response("", { status: 409 }))(input),
  ).rejects.toBeInstanceOf(JourneySelfReportConflict);
  const fetcher = vi.fn();
  await expect(
    createJourneySelfReportClient({ ...scope, getAccessToken: async () => null }, fetcher)(input),
  ).rejects.toThrow("Session required");
  expect(fetcher).not.toHaveBeenCalled();
});
it("cliente não aceita IDs de paciente/tenant no input", async () => {
  const fetcher = vi.fn();
  await expect(
    createJourneySelfReportClient(scope, fetcher)({ ...input, patientId: patient }),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
