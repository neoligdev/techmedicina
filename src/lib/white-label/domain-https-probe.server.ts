import "@tanstack/react-start/server-only";
import { request } from "node:https";
import { isIP } from "node:net";
import { checkServerIdentity, type TLSSocket } from "node:tls";
import { lookup } from "node:dns/promises";
import { z } from "zod";
import type { AuthenticatedIdentity } from "../auth/core";
import { AuthError } from "../auth/guards.server";
import { reservedDomainSchema } from "@/features/auth/domain-reservations";
import { normalizeHost, isLocalOrPreviewHost } from "./host-resolver";
import { isPublicProbeAddress } from "./public-probe-address.server";
export const ROUTING_PROBE_PATH = "/.well-known/plugpix-routing";
export type ProbeTarget = {
  hostname: string;
  address: string;
  family: 4 | 6;
  maxBytes: number;
  signal: AbortSignal;
};
export type ProbeResponse = { status: number; body: Buffer; certificateFingerprint: string };
/** Direct literal-IP connection: no second DNS lookup, proxy, redirect or shared socket. */
export function pinnedHttpsRequest(target: ProbeTarget): Promise<ProbeResponse> {
  if (
    !isPublicProbeAddress(target.address) ||
    isIP(target.address) !== target.family ||
    normalizeHost(target.hostname).host !== target.hostname ||
    isIP(target.hostname) ||
    isLocalOrPreviewHost(target.hostname) ||
    !Number.isInteger(target.maxBytes) ||
    target.maxBytes < 1 ||
    target.maxBytes > 16384 ||
    target.signal.aborted
  )
    return Promise.reject(new Error("Invalid HTTPS target"));
  return new Promise((resolve, reject) => {
    const req = request(
      {
        protocol: "https:",
        hostname: target.address,
        family: target.family,
        port: 443,
        method: "GET",
        path: ROUTING_PROBE_PATH,
        servername: target.hostname,
        agent: false,
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
        signal: target.signal,
        maxHeaderSize: 8192,
        checkServerIdentity: (_host, cert) => checkServerIdentity(target.hostname, cert),
        headers: { Host: target.hostname, Accept: "text/plain", "Accept-Encoding": "identity" },
      },
      (res) => {
        const socket = res.socket as TLSSocket;
        const fingerprint = socket
          .getPeerCertificate?.()
          .fingerprint256?.replaceAll(":", "")
          .toLowerCase();
        if (
          res.statusCode !== 200 ||
          !socket.authorized ||
          !fingerprint ||
          !/^[a-f0-9]{64}$/.test(fingerprint)
        ) {
          res.destroy();
          req.destroy();
          reject(new Error("HTTPS verification failed"));
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("error", reject);
        res.on("aborted", () => reject(new Error("Incomplete HTTPS response")));
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > target.maxBytes) {
            res.destroy();
            req.destroy();
            reject(new Error("Response too large"));
          } else chunks.push(chunk);
        });
        res.on("end", () =>
          res.complete
            ? resolve({
                status: 200,
                body: Buffer.concat(chunks),
                certificateFingerprint: fingerprint,
              })
            : reject(new Error("Incomplete HTTPS response")),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}
type Dependencies = {
  resolve?: (hostname: string) => Promise<{ address: string; family: number }[]>;
  exchange?: (target: ProbeTarget) => Promise<ProbeResponse>;
};
/** Transport observation only: caller still needs an unforgeable host-bound project routing proof.
 * No handler, provider, expected deployment marker or domain activation is configured here. */
export async function probeDomainHttps(
  identity: AuthenticatedIdentity,
  storedReservation: unknown,
  policy: { timeoutMs: number; maxBytes: number },
  dependencies: Dependencies = {},
) {
  if (identity.globalRole !== "super_admin")
    throw new AuthError("Administrative access denied", 403);
  const domain = reservedDomainSchema.safeParse(storedReservation);
  if (!domain.success || isIP(domain.data.hostname) || isLocalOrPreviewHost(domain.data.hostname))
    throw new AuthError("Invalid probe domain", 400);
  if (
    !Number.isInteger(policy.timeoutMs) ||
    policy.timeoutMs < 1 ||
    policy.timeoutMs > 30000 ||
    !Number.isInteger(policy.maxBytes) ||
    policy.maxBytes < 1 ||
    policy.maxBytes > 16384
  )
    throw new AuthError("Invalid probe policy", 400);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("Probe deadline"));
      }, policy.timeoutMs);
    });
    const work = async () => {
      const resolve =
        dependencies.resolve ?? ((host) => lookup(host, { all: true, verbatim: true }));
      const answers = await resolve(domain.data.hostname);
      if (controller.signal.aborted) throw new Error("Probe aborted");
      const parsed = z
        .array(
          z.object({ address: z.string(), family: z.union([z.literal(4), z.literal(6)]) }).strict(),
        )
        .min(1)
        .max(32)
        .parse(answers);
      if (
        parsed.some(
          (answer) =>
            !isPublicProbeAddress(answer.address) ||
            (answer.address.includes(":") ? 6 : 4) !== answer.family,
        )
      )
        throw new Error("Non-public probe target");
      const chosen = parsed[0]!;
      const result = await (dependencies.exchange ?? pinnedHttpsRequest)({
        hostname: domain.data.hostname,
        address: chosen.address,
        family: chosen.family,
        maxBytes: policy.maxBytes,
        signal: controller.signal,
      });
      if (
        controller.signal.aborted ||
        result.status !== 200 ||
        !Buffer.isBuffer(result.body) ||
        result.body.length > policy.maxBytes ||
        !/^[a-f0-9]{64}$/.test(result.certificateFingerprint)
      )
        throw new Error("Invalid probe response");
      return {
        domainId: domain.data.id,
        clinicId: domain.data.clinic_id,
        hostname: domain.data.hostname,
        environment: domain.data.environment,
        revision: domain.data.revision,
        observedAt: new Date().toISOString(),
        body: result.body,
        certificateFingerprint: result.certificateFingerprint,
      };
    };
    return await Promise.race([work(), deadline]);
  } catch {
    throw new AuthError("HTTPS probe unavailable", 503);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    controller.abort();
  }
}
