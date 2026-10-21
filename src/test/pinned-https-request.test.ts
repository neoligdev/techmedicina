// @vitest-environment node
import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import type { PeerCertificate } from "node:tls";
import { beforeEach, it, expect, vi } from "vitest";
const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }));
vi.mock("node:https", () => ({ request: mockRequest }));
import {
  pinnedHttpsRequest,
  ROUTING_PROBE_PATH,
} from "@/lib/white-label/domain-https-probe.server";
let options: Record<string, unknown>;
let config: { status: number; authorized: boolean; complete: boolean; chunks: Buffer[] };
beforeEach(() => {
  config = {
    status: 200,
    authorized: true,
    complete: true,
    chunks: [Buffer.from("route response")],
  };
  mockRequest.mockReset();
  mockRequest.mockImplementation(
    (opts: Record<string, unknown>, callback: (res: IncomingMessage) => void) => {
      options = opts;
      const res = Object.assign(new EventEmitter(), {
        statusCode: config.status,
        complete: config.complete,
        socket: {
          authorized: config.authorized,
          getPeerCertificate: () => ({ fingerprint256: Array(32).fill("AB").join(":") }),
        },
        destroy: vi.fn(),
      });
      const req = Object.assign(new EventEmitter(), {
        destroy: vi.fn(),
        end: () =>
          queueMicrotask(() => {
            callback(res as unknown as IncomingMessage);
            for (const chunk of config.chunks) res.emit("data", chunk);
            res.emit("end");
          }),
      });
      return req;
    },
  );
});
const target = () => ({
  hostname: "portal.example.com",
  address: "1.1.1.1",
  family: 4 as const,
  maxBytes: 1024,
  signal: new AbortController().signal,
});
it("connects to literal IP with exact SNI/Host and certificate identity, without agent or redirect", async () => {
  const result = await pinnedHttpsRequest(target());
  expect(result.body.toString()).toBe("route response");
  expect(options).toMatchObject({
    hostname: "1.1.1.1",
    servername: "portal.example.com",
    port: 443,
    path: ROUTING_PROBE_PATH,
    agent: false,
    rejectUnauthorized: true,
    minVersion: "TLSv1.2",
    headers: { Host: "portal.example.com" },
  });
  const check = options["checkServerIdentity"] as (
    host: string,
    cert: PeerCertificate,
  ) => Error | undefined;
  expect(
    check("1.1.1.1", { subjectaltname: "DNS:portal.example.com" } as PeerCertificate),
  ).toBeUndefined();
  expect(
    check("1.1.1.1", { subjectaltname: "DNS:other.example.com" } as PeerCertificate),
  ).toBeInstanceOf(Error);
  expect(options["headers"]).not.toHaveProperty("Authorization");
  expect(options["headers"]).not.toHaveProperty("Cookie");
});
it.each(["certificate", "redirect", "oversize", "incomplete"])(
  "rejects %s at the transport boundary",
  async (failure) => {
    if (failure === "certificate") config.authorized = false;
    if (failure === "redirect") config.status = 302;
    if (failure === "oversize") config.chunks = [Buffer.alloc(1025)];
    if (failure === "incomplete") config.complete = false;
    await expect(pinnedHttpsRequest(target())).rejects.toBeInstanceOf(Error);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  },
);
it("cannot bypass public-address validation by invoking transport directly", async () => {
  await expect(pinnedHttpsRequest({ ...target(), address: "127.0.0.1" })).rejects.toBeInstanceOf(
    Error,
  );
  expect(mockRequest).not.toHaveBeenCalled();
});
