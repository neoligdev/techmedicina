// @vitest-environment node
import { expect, it, vi } from "vitest";
import { isPublicProbeAddress } from "@/lib/white-label/public-probe-address.server";
import { probeDomainHttps } from "@/lib/white-label/domain-https-probe.server";
const identity = {
  userId: "11111111-1111-4111-8111-111111111111",
  globalRole: "super_admin" as const,
  links: [],
};
const domain = {
  id: identity.userId,
  clinic_id: "22222222-2222-4222-8222-222222222222",
  hostname: "portal.example.com",
  environment: "clinic_portal",
  status: "pending_verification",
  revision: 2,
  created_at: "2026-10-20T00:00:00Z",
};
const policy = { timeoutMs: 1000, maxBytes: 1024 };
const response = {
  status: 200,
  body: Buffer.from("untrusted routing response"),
  certificateFingerprint: "a".repeat(64),
};
it.each([
  "0.0.0.0",
  "10.1.2.3",
  "100.64.0.1",
  "100.127.255.255",
  "127.0.0.2",
  "169.254.169.254",
  "172.16.0.1",
  "172.31.255.255",
  "192.168.1.1",
  "192.0.0.9",
  "192.0.2.1",
  "192.88.99.1",
  "198.18.0.1",
  "198.19.255.255",
  "198.51.100.1",
  "203.0.113.1",
  "224.0.0.1",
  "255.255.255.255",
  "::",
  "::1",
  "::ffff:127.0.0.1",
  "::ffff:7f00:1",
  "64:ff9b::7f00:1",
  "fc00::1",
  "fe80::1",
  "fe80::1%eth0",
  "ff02::1",
  "2001::1",
  "2001:20::1",
  "2001:db8::1",
  "2002:7f00::1",
  "3fff:fff::1",
  "5f00::1",
  "not-ip",
  "0177.0.0.1",
])("rejects special/private/malformed address %s", (address) =>
  expect(isPublicProbeAddress(address)).toBe(false),
);
it.each([
  "1.1.1.1",
  "8.8.8.8",
  "100.128.0.1",
  "172.32.0.1",
  "2001:4860:4860::8888",
  "2606:4700:4700::1111",
  "2804:14c:5b80::1",
])("accepts ordinary public address %s", (address) =>
  expect(isPublicProbeAddress(address)).toBe(true),
);
it("pins a checked public IP and returns only a transport observation", async () => {
  const resolve = vi.fn(async () => [{ address: "1.1.1.1", family: 4 }]);
  const exchange = vi.fn(async () => response);
  const observation = await probeDomainHttps(identity, domain, policy, { resolve, exchange });
  expect(exchange).toHaveBeenCalledWith(
    expect.objectContaining({
      hostname: domain.hostname,
      address: "1.1.1.1",
      family: 4,
      maxBytes: 1024,
    }),
  );
  expect(resolve).toHaveBeenCalledTimes(1);
  expect(observation).toMatchObject({ domainId: domain.id, body: response.body });
  expect(observation).not.toHaveProperty("status");
  expect(observation).not.toHaveProperty("routingVerified");
});
it.each(
  [
    [
      { address: "1.1.1.1", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ],
    [
      { address: "2001:4860::1", family: 6 },
      { address: "::1", family: 6 },
    ],
    [],
    [{ address: "1.1.1.1", family: 6 }],
  ].map((answers) => ({ answers })),
)("rejects an entire unsafe/malformed DNS answer set before network", async ({ answers }) => {
  const exchange = vi.fn();
  await expect(
    probeDomainHttps(identity, domain, policy, { resolve: async () => answers, exchange }),
  ).rejects.toMatchObject({ status: 503 });
  expect(exchange).not.toHaveBeenCalled();
});
it("bounds DNS wait and prevents late resolution from starting a connection", async () => {
  let release!: (value: { address: string; family: number }[]) => void;
  const exchange = vi.fn();
  const pending = probeDomainHttps(
    identity,
    domain,
    { ...policy, timeoutMs: 10 },
    {
      resolve: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
      exchange,
    },
  );
  await expect(pending).rejects.toMatchObject({ status: 503 });
  release([{ address: "1.1.1.1", family: 4 }]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(exchange).not.toHaveBeenCalled();
});
it.each([
  { ...response, status: 302 },
  { ...response, status: 500 },
  { ...response, body: Buffer.alloc(1025) },
  { ...response, certificateFingerprint: "bad" },
])("rejects redirects, oversized or invalid response", async (result) => {
  await expect(
    probeDomainHttps(identity, domain, policy, {
      resolve: async () => [{ address: "1.1.1.1", family: 4 }],
      exchange: async () => result,
    }),
  ).rejects.toMatchObject({ status: 503 });
});
it("rejects callers, hosts and invalid policy before DNS", async () => {
  const resolve = vi.fn();
  await expect(
    probeDomainHttps({ userId: identity.userId, links: [] }, domain, policy, { resolve }),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    probeDomainHttps(identity, { ...domain, hostname: "127.0.0.1" }, policy, { resolve }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    probeDomainHttps(identity, domain, { ...policy, timeoutMs: 0 }, { resolve }),
  ).rejects.toMatchObject({ status: 400 });
  expect(resolve).not.toHaveBeenCalled();
});
