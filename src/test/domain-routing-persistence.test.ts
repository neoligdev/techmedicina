// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { createHash, generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { beforeAll, beforeEach, afterAll, expect, it, vi } from "vitest";
import {
  issueRoutingChallenge,
  signRoutingChallenge,
  type RoutingChallenge,
  type RoutingKey,
} from "@/lib/white-label/domain-routing-proof.server";
import {
  createPersistedRoutingVerifier,
  type RoutingReceipt,
} from "@/lib/white-label/domain-routing-persistence.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
let db: PGlite;
const operator = "11111111-1111-4111-8111-111111111111";
const clinic = "22222222-2222-4222-8222-222222222222";
const project = "33333333-3333-4333-8333-333333333333";
const identity: AuthenticatedIdentity = { userId: operator, globalRole: "super_admin", links: [] };
let domain: {
  id: string;
  clinic_id: string;
  hostname: string;
  environment: string;
  revision: number;
};
let challenge: RoutingChallenge, privateKey: RoutingKey, publicKey: RoutingKey;
async function user(id = operator, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`SET ROLE ${role === "anon" ? "anon" : "authenticated"}`);
}
async function issue(value: RoutingChallenge) {
  await db.exec("RESET ROLE");
  return (
    await db.query<{ saved: RoutingChallenge }>(
      "SELECT public.tm_issue_routing_challenge($1,$2::jsonb) AS saved",
      [operator, JSON.stringify(value)],
    )
  ).rows[0]!.saved;
}
async function read(actor: AuthenticatedIdentity, id: string) {
  // Emulates the reviewed private worker; no browser SELECT/EXECUTE grant.
  await db.exec("RESET ROLE");
  if (actor.userId !== operator) throw new Error("Unauthorized test worker");
  return (
    (
      await db.query<{ saved: unknown }>(
        `SELECT jsonb_build_object('domain',to_jsonb(d),'challenge',r.challenge) AS saved
    FROM public.tm_clinic_domains d JOIN public.tm_domain_routing_challenges r ON r.domain_id=d.id
    WHERE d.id=$1 AND r.revoked_at IS NULL AND r.consumed_at IS NULL`,
        [id],
      )
    ).rows[0]?.saved ?? null
  );
}
async function record(actor: AuthenticatedIdentity, receipt: RoutingReceipt) {
  await db.exec("RESET ROLE");
  return (
    await db.query<{ saved: RoutingReceipt }>(
      "SELECT public.tm_record_routing_receipt($1,$2::jsonb) AS saved",
      [actor.userId, JSON.stringify(receipt)],
    )
  ).rows[0]!.saved;
}
function verifier(
  exchange?: () => Promise<{ status: number; body: Buffer; certificateFingerprint: string }>,
) {
  return createPersistedRoutingVerifier(
    { read, record, readKey: async () => publicKey },
    { timeoutMs: 1000, maxBytes: 4096 },
    {
      resolve: async () => [{ address: "1.1.1.1", family: 4 }],
      exchange:
        exchange ??
        (async () => ({
          status: 200,
          certificateFingerprint: "a".repeat(64),
          body: Buffer.from(
            JSON.stringify(
              signRoutingChallenge(
                challenge,
                { hostname: domain.hostname, projectId: project },
                privateKey,
              ),
            ),
          ),
        })),
    },
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`);
  for (const file of [
    "001_tenant_foundation.sql",
    "006_domain_reservations.sql",
    "007_domain_collision_code.sql",
    "017_domain_challenges.sql",
    "018_domain_dns_observations.sql",
    "019_domain_dns_proof_read.sql",
    "020_domain_routing_persistence.sql",
  ])
    await db.exec(
      await readFile(new URL(`../../database/migrations/${file}`, import.meta.url), "utf8"),
    );
  await db.query("INSERT INTO public.tm_clinics(id,name) VALUES($1,'Synthetic QA')", [clinic]);
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [operator],
  );
}, 30000);
beforeEach(async () => {
  await db.exec("RESET ROLE; UPDATE public.tm_platform_operators SET is_active=true");
  await user();
  domain = (
    await db.query<{ saved: typeof domain }>("SELECT public.tm_reserve_domain($1,$2,$3) AS saved", [
      clinic,
      `qa-${randomUUID()}.example.com`,
      "clinic_portal",
    ])
  ).rows[0]!.saved;
  const dnsChallenge = (
    await db.query<{ saved: { id: string; revision: number } }>(
      "SELECT public.tm_issue_domain_challenge($1,$2,$3,$4) AS saved",
      [domain.id, 1, randomBytes(32).toString("hex"), new Date(Date.now() + 3600000).toISOString()],
    )
  ).rows[0]!.saved;
  domain.revision = dnsChallenge.revision;
  await db.exec("RESET ROLE");
  await db.query("SELECT public.tm_record_domain_dns_proof($1,$2,$3,$4,$5,$6)", [
    operator,
    domain.id,
    dnsChallenge.id,
    domain.revision,
    new Date().toISOString(),
    "b".repeat(64),
  ]);
  await user();
  const dns = (
    await db.query<{ saved: unknown }>("SELECT public.tm_read_domain_dns_proof($1,$2) AS saved", [
      domain.id,
      dnsChallenge.id,
    ])
  ).rows[0]!.saved;
  const keys = generateKeyPairSync("ed25519");
  const metadata = {
    projectId: project,
    keyId: `qa-${randomUUID()}`,
    isActive: true,
    notBefore: new Date(Date.now() - 86400000).toISOString(),
    notAfter: new Date(Date.now() + 86400000).toISOString(),
  };
  privateKey = { ...metadata, key: keys.privateKey };
  publicKey = { ...metadata, key: keys.publicKey };
  const digest = createHash("sha256")
    .update(keys.publicKey.export({ format: "der", type: "spki" }))
    .digest("hex");
  await db.exec("RESET ROLE");
  await db.query(
    `INSERT INTO public.tm_domain_routing_keys(project_id,key_id,public_key_digest,is_active,not_before,not_after)
    VALUES($1,$2,$3,true,$4,$5)`,
    [project, metadata.keyId, digest, metadata.notBefore, metadata.notAfter],
  );
  // Use the real persisted domain with its creation timestamp, never a browser reservation.
  const stored = (
    await db.query<{ d: unknown }>(
      "SELECT to_jsonb(d) AS d FROM public.tm_clinic_domains d WHERE id=$1",
      [domain.id],
    )
  ).rows[0]!.d;
  challenge = issueRoutingChallenge(identity, stored, dns, {
    projectId: project,
    keyId: metadata.keyId,
    expiresAt: new Date(Date.now() + 1800000).toISOString(),
  });
  challenge = await issue(challenge);
});
afterAll(async () => {
  await db?.close();
});
it("records a signed result once, audits it, and keeps domain pending", async () => {
  const receipt = await verifier()(identity, domain.id);
  expect(receipt).toMatchObject({ domainId: domain.id, challengeId: challenge.id });
  expect(receipt.publicKeyDigest).toHaveLength(64);
  await expect(record(identity, receipt)).rejects.toMatchObject({ code: "40001" });
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query("SELECT status,revision FROM public.tm_clinic_domains WHERE id=$1", [
        domain.id,
      ])
    ).rows,
  ).toEqual([{ status: "pending_verification", revision: domain.revision }]);
  expect(
    (
      await db.query(
        "SELECT action FROM public.tm_domain_routing_audit WHERE domain_id=$1 ORDER BY occurred_at",
        [domain.id],
      )
    ).rows,
  ).toEqual([{ action: "routing_issued" }, { action: "routing_recorded" }]);
  await expect(verifier()(identity, domain.id)).rejects.toMatchObject({ status: 409 });
});
it.each(["operator", "key", "dns", "revision", "rotation", "digest", "keyWindow"])(
  "rechecks %s changed during HTTPS before consuming",
  async (change) => {
    await expect(
      verifier(async () => {
        const body = Buffer.from(
          JSON.stringify(
            signRoutingChallenge(
              challenge,
              { hostname: domain.hostname, projectId: project },
              privateKey,
            ),
          ),
        );
        await db.exec("RESET ROLE");
        if (change === "operator")
          await db.query(
            "UPDATE public.tm_platform_operators SET is_active=false WHERE user_id=$1",
            [operator],
          );
        if (change === "keyWindow")
          await db.query(
            "UPDATE public.tm_domain_routing_keys SET not_after=clock_timestamp()+interval '1 minute' WHERE key_id=$1",
            [publicKey.keyId],
          );
        if (change === "key")
          await db.query(
            "UPDATE public.tm_domain_routing_keys SET is_active=false WHERE key_id=$1",
            [publicKey.keyId],
          );
        if (change === "digest")
          await db.query(
            "UPDATE public.tm_domain_routing_keys SET public_key_digest=$1 WHERE key_id=$2",
            ["c".repeat(64), publicKey.keyId],
          );
        if (change === "dns")
          await db.query(
            "UPDATE public.tm_domain_challenges SET revoked_at=clock_timestamp() WHERE id=$1",
            [challenge.dnsChallengeId],
          );
        if (change === "revision")
          await db.query("UPDATE public.tm_clinic_domains SET revision=revision+1 WHERE id=$1", [
            domain.id,
          ]);
        if (change === "rotation")
          await issue({ ...challenge, id: randomUUID(), nonce: randomBytes(32).toString("hex") });
        return { status: 200, body, certificateFingerprint: "a".repeat(64) };
      })(identity, domain.id),
    ).rejects.toMatchObject({ status: change === "operator" ? 503 : 409 });
    await db.exec("RESET ROLE");
    expect(
      (
        await db.query("SELECT * FROM public.tm_domain_routing_receipts WHERE challenge_id=$1", [
          challenge.id,
        ])
      ).rows,
    ).toHaveLength(0);
  },
);
it("duplicate issue rolls back rotation and its audit entry", async () => {
  await expect(issue(challenge)).rejects.toMatchObject({ code: "23505" });
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query("SELECT revoked_at FROM public.tm_domain_routing_challenges WHERE id=$1", [
        challenge.id,
      ])
    ).rows,
  ).toEqual([{ revoked_at: null }]);
  expect(
    (await db.query("SELECT * FROM public.tm_domain_routing_audit WHERE domain_id=$1", [domain.id]))
      .rows,
  ).toHaveLength(1);
});
it.each(["authenticated", "anon"])(
  "does not grant %s proof writes or table access",
  async (role) => {
    await user(operator, role);
    for (const sql of [
      "SELECT * FROM public.tm_domain_routing_keys",
      "SELECT * FROM public.tm_domain_routing_challenges",
      "SELECT * FROM public.tm_domain_routing_receipts",
      "UPDATE public.tm_domain_routing_keys SET is_active=true",
      "SELECT public.tm_issue_routing_challenge(NULL,NULL)",
      "SELECT public.tm_record_routing_receipt(NULL,NULL)",
      "SELECT public.tm_lock_routing_scope(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL)",
    ])
      await expect(db.exec(sql)).rejects.toMatchObject({ code: "42501" });
  },
);
it("rejects wrong tenant at issuance without rotating current challenge", async () => {
  await expect(issue({ ...challenge, id: randomUUID(), clinicId: project })).rejects.toMatchObject({
    code: "40001",
  });
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query("SELECT revoked_at FROM public.tm_domain_routing_challenges WHERE id=$1", [
        challenge.id,
      ])
    ).rows,
  ).toEqual([{ revoked_at: null }]);
});
it("rejects ordinary identity and invalid IDs before reading any state", async () => {
  const get = vi.fn();
  const save = vi.fn();
  const readKey = vi.fn();
  const verify = createPersistedRoutingVerifier(
    { read: get, record: save, readKey },
    { timeoutMs: 1000, maxBytes: 4096 },
  );
  await expect(verify({ userId: operator, links: [] }, domain.id)).rejects.toMatchObject({
    status: 403,
  });
  await expect(verify(identity, "invalid")).rejects.toMatchObject({ status: 400 });
  expect(get).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});

it("refuses expiry and extra fields at issuance with no audit or rotation", async () => {
  await expect(
    issue({ ...challenge, id: randomUUID(), expiresAt: new Date(Date.now() - 1000).toISOString() }),
  ).rejects.toMatchObject({ code: "40001" });
  await expect(
    issue({ ...challenge, id: randomUUID(), extra: true } as RoutingChallenge),
  ).rejects.toMatchObject({ code: "22023" });
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query("SELECT revoked_at FROM public.tm_domain_routing_challenges WHERE id=$1", [
        challenge.id,
      ])
    ).rows,
  ).toEqual([{ revoked_at: null }]);
  expect(
    (await db.query("SELECT * FROM public.tm_domain_routing_audit WHERE domain_id=$1", [domain.id]))
      .rows,
  ).toHaveLength(1);
});

it("ordinary users cannot read the audit, but active operators see no raw nonce", async () => {
  await user(randomUUID());
  expect((await db.query("SELECT * FROM public.tm_domain_routing_audit")).rows).toEqual([]);
  await user();
  const rows = (
    await db.query("SELECT * FROM public.tm_domain_routing_audit WHERE domain_id=$1", [domain.id])
  ).rows;
  expect(rows).toHaveLength(1);
  expect(JSON.stringify(rows)).not.toContain(challenge.nonce);
});

it.each(["clinicId", "challengeId", "routingVerifiedAt"] as const)(
  "rejects an altered persistence acknowledgement: %s",
  async (field) => {
    const verify = createPersistedRoutingVerifier(
      {
        read,
        readKey: async () => publicKey,
        record: async (_actor, receipt) => ({
          ...receipt,
          [field]:
            field === "routingVerifiedAt"
              ? new Date(Date.parse(receipt.routingVerifiedAt) + 1).toISOString()
              : randomUUID(),
        }),
      },
      { timeoutMs: 1000, maxBytes: 4096 },
      {
        resolve: async () => [{ address: "1.1.1.1", family: 4 }],
        exchange: async () => ({
          status: 200,
          certificateFingerprint: "a".repeat(64),
          body: Buffer.from(
            JSON.stringify(
              signRoutingChallenge(
                challenge,
                { hostname: domain.hostname, projectId: project },
                privateKey,
              ),
            ),
          ),
        }),
      },
    );
    await expect(verify(identity, domain.id)).rejects.toMatchObject({ status: 503 });
  },
);
