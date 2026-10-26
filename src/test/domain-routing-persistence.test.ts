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
  // Reviewed private RPC, not a browser client or ad-hoc table SELECT.
  await db.exec("RESET ROLE");
  return (
    await db.query<{ saved: unknown }>("SELECT public.tm_read_routing_challenge($1,$2) AS saved", [
      actor.userId,
      id,
    ])
  ).rows[0]!.saved;
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
    "021_domain_routing_reads.sql",
    "022_domain_routing_key_revocation.sql",
    "023_domain_routing_key_audit_read.sql",
    "024_domain_routing_key_inventory.sql",
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

async function receiptState(actor = operator, id = domain.id, challengeId = challenge.id) {
  await db.exec("RESET ROLE");
  return (
    await db.query<{
      saved: { receipt: RoutingReceipt; isCurrent: boolean; isValid: boolean } | null;
    }>("SELECT public.tm_read_routing_receipt($1,$2,$3) AS saved", [actor, id, challengeId])
  ).rows[0]!.saved;
}
it("private reads return current challenges and scoped historical receipts without another consumption", async () => {
  expect(await read(identity, domain.id)).toMatchObject({ challenge });
  expect(await read(identity, randomUUID())).toBeNull();
  expect(await receiptState()).toBeNull();
  const receipt = await verifier()(identity, domain.id);
  expect(await read(identity, domain.id)).toBeNull();
  expect(await receiptState()).toMatchObject({ receipt, isCurrent: true, isValid: true });
  expect(await receiptState()).toMatchObject({ receipt, isCurrent: true, isValid: true });
  expect(await receiptState(operator, randomUUID())).toBeNull();
  expect(await receiptState(operator, domain.id, randomUUID())).toBeNull();
  await db.exec("RESET ROLE");
  expect(
    (
      await db.query("SELECT action FROM public.tm_domain_routing_audit WHERE domain_id=$1", [
        domain.id,
      ])
    ).rows,
  ).toHaveLength(2);
});
it.each(["key", "digest", "dns", "revision", "rotation"])(
  "historical receipt remains available but invalid after %s changes",
  async (change) => {
    const receipt = await verifier()(identity, domain.id);
    await db.exec("RESET ROLE");
    if (change === "key")
      await db.query("UPDATE public.tm_domain_routing_keys SET is_active=false WHERE key_id=$1", [
        publicKey.keyId,
      ]);
    if (change === "digest")
      await db.query(
        "UPDATE public.tm_domain_routing_keys SET public_key_digest=$1 WHERE key_id=$2",
        ["d".repeat(64), publicKey.keyId],
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
    expect(await receiptState()).toMatchObject({
      receipt,
      isCurrent: change === "key",
      isValid: false,
    });
  },
);
it.each(["authenticated", "anon"])("keeps new read RPCs private from %s", async (role) => {
  await user(operator, role);
  await expect(
    db.query("SELECT public.tm_read_routing_challenge($1,$2)", [operator, domain.id]),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    db.query("SELECT public.tm_read_routing_receipt($1,$2,$3)", [
      operator,
      domain.id,
      challenge.id,
    ]),
  ).rejects.toMatchObject({ code: "42501" });
});
it("private connection cannot impersonate an inactive or ordinary operator", async () => {
  await expect(
    read({ userId: randomUUID(), globalRole: "super_admin", links: [] }, domain.id),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(receiptState(randomUUID())).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_platform_operators SET is_active=false WHERE user_id=$1", [
    operator,
  ]);
  await expect(read(identity, domain.id)).rejects.toMatchObject({ code: "42501" });
});

it("audits key revocation once, preserves receipt history and invalidates current proof", async () => {
  const receipt = await verifier()(identity, domain.id);
  await db.exec("RESET ROLE");
  const revoke = async (revision: number) =>
    (
      await db.query<{ saved: { revision: number; isActive: boolean; changed: boolean } }>(
        "SELECT public.tm_revoke_routing_key($1,$2,$3,$4) AS saved",
        [operator, project, publicKey.keyId, revision],
      )
    ).rows[0]!.saved;
  expect(await revoke(1)).toMatchObject({ revision: 2, isActive: false, changed: true });
  await expect(revoke(1)).rejects.toMatchObject({ code: "40001" });
  expect(await revoke(2)).toMatchObject({ revision: 2, isActive: false, changed: false });
  const history = (
    await db.query<{ saved: { isValid: boolean; isCurrent: boolean; receipt: unknown } }>(
      "SELECT public.tm_read_routing_receipt($1,$2,$3) AS saved",
      [operator, domain.id, challenge.id],
    )
  ).rows[0]!.saved;
  expect(history.isValid).toBe(false);
  expect(history.receipt).toEqual(receipt);
  expect(
    (
      await db.query(
        "SELECT * FROM public.tm_domain_routing_key_audit WHERE project_id=$1 AND key_id=$2",
        [project, publicKey.keyId],
      )
    ).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("SELECT status FROM public.tm_clinic_domains WHERE id=$1", [domain.id]))
      .rows[0],
  ).toEqual({ status: "pending_verification" });
  await expect(
    db.query(
      "UPDATE public.tm_domain_routing_keys SET is_active=true WHERE project_id=$1 AND key_id=$2",
      [project, publicKey.keyId],
    ),
  ).rejects.toMatchObject({ code: "23514" });
});
it("revocation blocks proof writes already in flight without deleting their challenge", async () => {
  const original = challenge;
  const verify = verifier(async () => {
    await db.exec("RESET ROLE");
    await db.query("SELECT public.tm_revoke_routing_key($1,$2,$3,1)", [
      operator,
      project,
      publicKey.keyId,
    ]);
    return {
      status: 200,
      certificateFingerprint: "a".repeat(64),
      body: Buffer.from(
        JSON.stringify(
          signRoutingChallenge(
            original,
            { hostname: domain.hostname, projectId: project },
            privateKey,
          ),
        ),
      ),
    };
  });
  await expect(verify(identity, domain.id)).rejects.toMatchObject({ status: 409 });
  expect(
    (
      await db.query("SELECT * FROM public.tm_domain_routing_receipts WHERE challenge_id=$1", [
        original.id,
      ])
    ).rows,
  ).toEqual([]);
});
it("key revocation denies browser clients and revoked operators and cannot cross a project", async () => {
  await user();
  await expect(
    db.query("SELECT public.tm_revoke_routing_key($1,$2,$3,1)", [
      operator,
      project,
      publicKey.keyId,
    ]),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(db.exec("SELECT * FROM public.tm_domain_routing_key_audit")).rejects.toMatchObject({
    code: "42501",
  });
  await db.exec("RESET ROLE");
  await expect(
    db.query("SELECT public.tm_revoke_routing_key($1,$2,$3,1)", [
      operator,
      clinic,
      publicKey.keyId,
    ]),
  ).rejects.toMatchObject({ code: "40001" });
  await db.query("UPDATE public.tm_platform_operators SET is_active=false WHERE user_id=$1", [
    operator,
  ]);
  await expect(
    db.query("SELECT public.tm_revoke_routing_key($1,$2,$3,1)", [
      operator,
      project,
      publicKey.keyId,
    ]),
  ).rejects.toMatchObject({ code: "42501" });
});

it("rolls back key state and revision if revocation audit cannot be written", async () => {
  await db.exec("RESET ROLE");
  await db.exec(`CREATE FUNCTION pg_temp.reject_key_audit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$;
    CREATE TRIGGER reject_key_audit BEFORE INSERT ON public.tm_domain_routing_key_audit
      FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_key_audit();`);
  try {
    await expect(
      db.query("SELECT public.tm_revoke_routing_key($1,$2,$3,1)", [
        operator,
        project,
        publicKey.keyId,
      ]),
    ).rejects.toMatchObject({ code: "P0001" });
    expect(
      (
        await db.query(
          "SELECT is_active,revision,revoked_at,revoked_by FROM public.tm_domain_routing_keys WHERE project_id=$1 AND key_id=$2",
          [project, publicKey.keyId],
        )
      ).rows[0],
    ).toEqual({ is_active: true, revision: 1, revoked_at: null, revoked_by: null });
    expect(
      (
        await db.query(
          "SELECT * FROM public.tm_domain_routing_key_audit WHERE project_id=$1 AND key_id=$2",
          [project, publicKey.keyId],
        )
      ).rows,
    ).toEqual([]);
  } finally {
    await db.exec("DROP TRIGGER reject_key_audit ON public.tm_domain_routing_key_audit");
  }
});

it("reads bounded private audit pages with stable cursor and exact key/project scope", async () => {
  await db.exec("RESET ROLE");
  await db.query("SELECT public.tm_revoke_routing_key($1,$2,$3,1)", [
    operator,
    project,
    publicKey.keyId,
  ]);
  const readPage = async (before: string | null = null, limit = 1, targetProject = project) =>
    (
      await db.query<{
        page: {
          projectId: string;
          keyId: string;
          entries: Array<{ id: string; revision: number }>;
        };
      }>("SELECT public.tm_read_routing_key_audit($1,$2,$3,$4,$5) AS page", [
        operator,
        targetProject,
        publicKey.keyId,
        before,
        limit,
      ])
    ).rows[0]!.page;
  const first = await readPage();
  expect(first).toMatchObject({
    projectId: project,
    keyId: publicKey.keyId,
    entries: [{ revision: 2 }],
  });
  expect((await readPage(first.entries[0]!.id)).entries).toEqual([]);
  expect((await readPage(null, 1, clinic)).entries).toEqual([]);
  await expect(readPage(first.entries[0]!.id, 1, clinic)).rejects.toMatchObject({ code: "22023" });
  await expect(readPage(null, 101)).rejects.toMatchObject({ code: "22023" });
  // Synthetic additional audit rows exercise ordering ties and page boundaries, not production writes.
  await db.query(
    `INSERT INTO public.tm_domain_routing_key_audit(project_id,key_id,actor_user_id,action,previous_revision,revision,was_active,public_key_digest,occurred_at)
    SELECT project_id,key_id,actor_user_id,action,previous_revision,revision,was_active,public_key_digest,occurred_at FROM public.tm_domain_routing_key_audit WHERE id=$1`,
    [first.entries[0]!.id],
  );
  const all = await readPage(null, 100);
  const page1 = await readPage();
  const page2 = await readPage(page1.entries[0]!.id);
  expect([...page1.entries, ...page2.entries]).toEqual(all.entries);
  expect(all.entries).toHaveLength(2);
});
it("denies audit reads to browser roles and inactive/non-administrative actors", async () => {
  for (const role of ["anon", "authenticated"]) {
    await user(operator, role);
    await expect(
      db.query("SELECT public.tm_read_routing_key_audit($1,$2,$3)", [
        operator,
        project,
        publicKey.keyId,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
  }
  await db.exec("RESET ROLE");
  await expect(
    db.query("SELECT public.tm_read_routing_key_audit($1,$2,$3)", [
      clinic,
      project,
      publicKey.keyId,
    ]),
  ).rejects.toMatchObject({ code: "42501" });
  await db.query("UPDATE public.tm_platform_operators SET is_active=false WHERE user_id=$1", [
    operator,
  ]);
  await expect(
    db.query("SELECT public.tm_read_routing_key_audit($1,$2,$3)", [
      operator,
      project,
      publicKey.keyId,
    ]),
  ).rejects.toMatchObject({ code: "42501" });
});

it("lists private key metadata within project with stable bounded lexical pages", async () => {
  await db.exec("RESET ROLE");
  const list = async (after: string | null = null, limit = 100, target = project) =>
    (
      await db.query<{
        page: {
          projectId: string;
          keys: Array<{
            keyId: string;
            revision: number;
            revokedAt: string | null;
            isActive: boolean;
          }>;
        };
      }>("SELECT public.tm_list_routing_keys($1,$2,$3,$4) AS page", [
        operator,
        target,
        after,
        limit,
      ])
    ).rows[0]!.page;
  const all = await list();
  expect(all.keys.some((k) => k.keyId === publicKey.keyId)).toBe(true);
  expect((await list(null, 100, clinic)).keys).toEqual([]);
  const first = await list(null, 1);
  expect(first.keys).toHaveLength(1);
  const rest = await list(first.keys[0]!.keyId);
  expect([...first.keys, ...rest.keys]).toEqual(all.keys);
  await expect(list(null, 101)).rejects.toMatchObject({ code: "22023" });
  await expect(list("../")).rejects.toMatchObject({ code: "22023" });
  await db.query("SELECT public.tm_revoke_routing_key($1,$2,$3,1)", [
    operator,
    project,
    publicKey.keyId,
  ]);
  expect((await list()).keys.find((k) => k.keyId === publicKey.keyId)).toMatchObject({
    revision: 2,
    isActive: false,
    revokedAt: expect.any(String),
  });
});
it("keeps key inventory unavailable to browser and revoked operators", async () => {
  for (const role of ["anon", "authenticated"]) {
    await user(operator, role);
    await expect(
      db.query("SELECT public.tm_list_routing_keys($1,$2)", [operator, project]),
    ).rejects.toMatchObject({ code: "42501" });
  }
  await db.exec("RESET ROLE");
  await db.query("UPDATE public.tm_platform_operators SET is_active=false WHERE user_id=$1", [
    operator,
  ]);
  await expect(
    db.query("SELECT public.tm_list_routing_keys($1,$2)", [operator, project]),
  ).rejects.toMatchObject({ code: "42501" });
});
