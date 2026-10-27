// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createBlogDraftClient, BlogDraftConflict } from "@/features/blog/draft-client";
import { blogDraftDocumentSchema } from "@/features/blog/draft-contract";
const id = "11111111-1111-4111-8111-111111111111",
  document = blogDraftDocumentSchema.parse({ title: "QA" });
const draft = {
  id,
  status: "draft",
  document,
  revision: 1,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};
it("validates same draft/content/revision and uses fresh bearer without browser credentials", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ draft }));
  expect(
    await createBlogDraftClient(async () => "qa", fetcher).save({
      id,
      expectedRevision: 0,
      document,
    }),
  ).toEqual(draft);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/platform/blog-draft?id=" + id,
    expect.objectContaining({
      method: "PUT",
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    }),
  );
});
it("denies false write confirmation and preserves conflict vs missing authorization", async () => {
  for (const wrong of [
    null,
    { ...draft, revision: 4 },
    { ...draft, document: { ...document, title: "Different" } },
    { ...draft, id: "22222222-2222-4222-8222-222222222222" },
  ])
    await expect(
      createBlogDraftClient(
        async () => "qa",
        async () => Response.json({ draft: wrong }),
      ).save({ id, expectedRevision: 0, document }),
    ).rejects.toThrow();
  await expect(
    createBlogDraftClient(
      async () => "qa",
      async () => new Response(null, { status: 409 }),
    ).save({ id, expectedRevision: 0, document }),
  ).rejects.toBeInstanceOf(BlogDraftConflict);
  const fetcher = vi.fn<typeof fetch>();
  await expect(createBlogDraftClient(async () => null, fetcher).read(id)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it("timeout bounds stalled token resolution before fetch", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn<typeof fetch>();
  try {
    const pending = createBlogDraftClient(() => new Promise(() => {}), fetcher).read(id);
    const assertion = expect(pending).rejects.toThrow("Request expired");
    await vi.advanceTimersByTimeAsync(20000);
    await assertion;
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
