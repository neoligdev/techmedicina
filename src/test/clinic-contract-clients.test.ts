// @vitest-environment node
import { it, expect, vi } from "vitest";
import { parseDraftMoney, formatDraftMoney } from "@/features/clinic-contracts/money";
import { emptyClinicContract } from "@/features/clinic-contracts/contracts";
import {
  createClinicContractClient,
  ClinicContractConflict,
} from "@/features/clinic-contracts/draft-client";
import { createContractClinicDirectoryClient } from "@/features/clinic-contracts/directory-client";
const id = "11111111-1111-4111-8111-111111111111",
  clinicId = "22222222-2222-4222-8222-222222222222";
const input = { id, clinicId, expectedRevision: 0, document: emptyClinicContract() };
const draft = {
  ...input,
  status: "draft",
  revision: 1,
  createdAt: "2026-10-28T10:00:00Z",
  updatedAt: "2026-10-28T10:00:00Z",
};
delete (draft as Partial<typeof input>).expectedRevision;
it("money conversion preserves cents and explicit zero without floating multiplication of decimals", () => {
  for (const [text, cents] of [
    ["", null],
    ["0", 0],
    ["12,34", 1234],
    ["0.01", 1],
    ["9999999999,99", 999999999999],
  ] as const)
    expect(parseDraftMoney(text)).toBe(cents);
  expect(formatDraftMoney(null)).toBe("");
  expect(formatDraftMoney(1234)).toBe("12,34");
  for (const bad of ["-1", "1e2", "Infinity", "1,234", "1.234,56", "10000000000", "00", "0."])
    expect(() => parseDraftMoney(bad)).toThrow();
});
it("client requires fresh bearer and exact clinic/content receipt", async () => {
  const getToken = vi
    .fn()
    .mockResolvedValue("qa")
    .mockResolvedValueOnce("first")
    .mockResolvedValueOnce("second");
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ draft }))
    .mockResolvedValueOnce(Response.json({ draft }));
  const client = createClinicContractClient(getToken, fetcher);
  await client.save(input);
  await client.read({ id, clinicId });
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    headers: { Authorization: "Bearer first" },
  });
  expect(fetcher.mock.calls[1]![1]?.headers).toMatchObject({ Authorization: "Bearer second" });
  expect(String(fetcher.mock.calls[0]![0])).toContain("clinicId=" + clinicId);
  for (const bad of [
    null,
    { ...draft, clinicId: id },
    { ...draft, revision: 3 },
    { ...draft, document: { ...draft.document, setupCents: 1 } },
  ]) {
    fetcher.mockResolvedValueOnce(Response.json({ draft: bad }));
    await expect(client.save(input)).rejects.toThrow();
  }
  fetcher.mockResolvedValueOnce(Response.json({}, { status: 409 }));
  await expect(
    createClinicContractClient(async () => "qa", fetcher).save(input),
  ).rejects.toBeInstanceOf(ClinicContractConflict);
});
it("client refuses unknown actor and missing session before network", async () => {
  const fetcher = vi.fn<typeof fetch>();
  await expect(createClinicContractClient(async () => null, fetcher).save(input)).rejects.toThrow();
  expect(() =>
    createClinicContractClient(async () => "qa", fetcher).save({ ...input, actor: id }),
  ).toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it("directory pagination validates cursor and rejects duplicate/malformed pages", async () => {
  const row = {
    id: clinicId,
    name: "Clínica QA",
    is_active: false,
    created_at: "2026-10-28T10:00:00Z",
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ clinics: [row], hasMore: false, nextCursor: null }));
  const read = createContractClinicDirectoryClient(async () => "qa", fetcher);
  expect((await read()).clinics[0]?.id).toBe(clinicId);
  for (const bad of [
    { clinics: [row, row], hasMore: false, nextCursor: null },
    { clinics: [row], hasMore: true, nextCursor: { before: row.created_at, beforeId: clinicId } },
    { clinics: [row], hasMore: false, nextCursor: { before: row.created_at, beforeId: clinicId } },
  ]) {
    fetcher.mockResolvedValueOnce(Response.json(bad));
    await expect(read()).rejects.toThrow();
  }
});
