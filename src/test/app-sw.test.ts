import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type RequestLike = { mode: string; url: string };
type EventLike = { request: RequestLike; respondWith: (response: Promise<unknown>) => void };
const source = readFileSync(resolve("public/app-sw.js"), "utf8");
function worker(fetcher: ReturnType<typeof vi.fn>) {
  const listeners = new Map<string, (event: EventLike) => void>();
  class OfflineResponse {
    constructor(
      public body: string,
      public options: { status: number },
    ) {}
  }
  runInNewContext(source, {
    self: {
      location: { origin: "https://example.test" },
      addEventListener: (name: string, listener: (event: EventLike) => void) =>
        listeners.set(name, listener),
    },
    URL,
    Response: OfflineResponse,
    fetch: fetcher,
  });
  return { listener: listeners.get("fetch")!, OfflineResponse };
}
describe("Patient PWA network-only worker", () => {
  it("requests patient navigation without caching health screens", async () => {
    const fetcher = vi.fn().mockResolvedValue("network response");
    const { listener } = worker(fetcher);
    const request = { mode: "navigate", url: "https://example.test/app/saude" };
    let response: Promise<unknown> | undefined;
    listener({
      request,
      respondWith: (value) => {
        response = value;
      },
    });
    expect(fetcher).toHaveBeenCalledWith(request, { cache: "no-store" });
    expect(await response).toBe("network response");
  });
  it("leaves API and administrative requests untouched", () => {
    const fetcher = vi.fn();
    const { listener } = worker(fetcher);
    const respondWith = vi.fn();
    for (const url of [
      "https://example.test/api/access-check",
      "https://example.test/super-admin",
      "https://another.test/app",
    ])
      listener({ request: { mode: "navigate", url }, respondWith });
    listener({ request: { mode: "cors", url: "https://example.test/app/saude" }, respondWith });
    expect(fetcher).not.toHaveBeenCalled();
    expect(respondWith).not.toHaveBeenCalled();
  });
  it("returns a generic offline message instead of a cached health page", async () => {
    const { listener, OfflineResponse } = worker(vi.fn().mockRejectedValue(new Error("offline")));
    let response: Promise<unknown> | undefined;
    listener({
      request: { mode: "navigate", url: "https://example.test/app" },
      respondWith: (value) => {
        response = value;
      },
    });
    const result = await response;
    expect(result).toBeInstanceOf(OfflineResponse);
    expect(result).toMatchObject({
      options: { status: 503 },
      body: expect.stringContaining("Nenhum dado de saúde foi guardado"),
    });
  });
});
