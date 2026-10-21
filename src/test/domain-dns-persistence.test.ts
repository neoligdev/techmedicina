// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
import {
  createPersistedDnsVerifier,
  type DnsProof,
} from "@/lib/white-label/domain-dns-persistence.server";
import {
  domainChallengeRecord,
  type DomainChallenge,
} from "@/lib/white-label/domain-possession.server";
import type { AuthenticatedIdentity } from "@/lib/auth/core";
let db: PGlite;
const operator = "00000000-0000-4000-8000-000000000001";
const clinic = "00000000-0000-4000-8000-000000000002";
const identity: AuthenticatedIdentity = { userId: operator, globalRole: "super_admin", links: [] };
let domain: string, challenge: DomainChallenge;
async function user(id = operator, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`SET ROLE ${role === "anon" ? "anon" : "authenticated"}`);
}
async function issue(revision = 1) {
  await user();
  return (
    await db.query<{ saved: DomainChallenge }>(
      "SELECT public.tm_issue_domain_challenge($1,$2,$3,$4) AS saved",
      [domain, revision, randomBytes(32).toString("hex"), "2099-01-01Z"],
    )
  ).rows[0]!.saved;
}
async function read(_identity = identity, id = domain) {
  await user(_identity.userId);
  return (
    await db.query<{ saved: unknown }>("SELECT public.tm_read_domain_challenge($1) AS saved", [id])
  ).rows[0]!.saved;
}
async function record(actor: AuthenticatedIdentity, proof: DnsProof) {
  // Emulates the private worker connection; no browser client is granted this operation.
  await db.exec("RESET ROLE");
  return (
    await db.query<{ saved: unknown }>(
      "SELECT public.tm_record_domain_dns_proof($1,$2,$3,$4,$5,$6) AS saved",
      [
        actor.userId,
        proof.domainId,
        proof.challengeId,
        proof.revision,
        proof.dnsVerifiedAt,
        proof.proofDigest,
      ],
    )
  ).rows[0]!.saved;
}
function verifier(lookup = async () => [[domainChallengeRecord(challenge).value]]) {
  return createPersistedDnsVerifier({ read, record }, { timeoutMs: 1000 }, lookup);
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
  ])
    await db.exec(
      await readFile(new URL(`../../database/migrations/${file}`, import.meta.url), "utf8"),
    );
  await db.query("INSERT INTO public.tm_clinics(id,name) VALUES($1,'QA')", [clinic]);
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [operator],
  );
}, 30000);
beforeEach(async () => {
  await db.exec("RESET ROLE; UPDATE public.tm_platform_operators SET is_active=true");
  await user();
  domain = (
    await db.query<{ saved: { id: string } }>(
      "SELECT public.tm_reserve_domain($1,$2,$3) AS saved",
      [clinic, `portal-${randomUUID()}.example.com`, "clinic_portal"],
    )
  ).rows[0]!.saved.id;
  challenge = await issue();
});
afterAll(async () => {
  await db?.close();
});
it("reads, verifies exact DNS, persists without raw token, consumes once and never activates", async () => {
  const proof = await verifier()(identity, domain);
  expect(proof).toMatchObject({
    challengeId: challenge.id,
    clinicId: clinic,
    domainId: domain,
    revision: 2,
  });
  expect(JSON.stringify(proof)).not.toContain(challenge.token);
  expect(await read()).toBeNull();
  await db.exec("RESET ROLE");
  const rows = (
    await db.query<{ proof_digest: string }>(
      "SELECT * FROM public.tm_domain_dns_proofs WHERE domain_id=$1",
      [domain],
    )
  ).rows;
  expect(rows).toHaveLength(1);
  expect(JSON.stringify(rows)).not.toContain(challenge.token);
  expect(
    (await db.query("SELECT status FROM public.tm_clinic_domains WHERE id=$1", [domain])).rows[0],
  ).toEqual({ status: "pending_verification" });
  await expect(record(identity, proof)).rejects.toMatchObject({ code: "40001" });
});
it("rejects rotation while DNS is in flight and does not store the old observation", async () => {
  const old = challenge;
  const verify = verifier(async () => {
    await issue(2);
    return [[domainChallengeRecord(old).value]];
  });
  await expect(verify(identity, domain)).rejects.toMatchObject({ status: 409 });
  await db.exec("RESET ROLE");
  expect(
    (await db.query("SELECT * FROM public.tm_domain_dns_proofs WHERE domain_id=$1", [domain])).rows,
  ).toEqual([]);
});
it("rejects operator revocation after DNS lookup before persistence", async () => {
  const verify = verifier(async () => {
    await db.exec("RESET ROLE; UPDATE public.tm_platform_operators SET is_active=false");
    return [[domainChallengeRecord(challenge).value]];
  });
  await expect(verify(identity, domain)).rejects.toMatchObject({ status: 503 });
  expect(
    (await db.query("SELECT * FROM public.tm_domain_dns_proofs WHERE domain_id=$1", [domain])).rows,
  ).toEqual([]);
});
it("ordinary/anonymous clients cannot read challenges or forge stored proof even with a known TXT", async () => {
  await user(clinic);
  await expect(read({ userId: clinic, links: [] })).rejects.toMatchObject({ code: "42501" });
  await user("", "anon");
  await expect(
    db.query("SELECT public.tm_read_domain_challenge($1)", [domain]),
  ).rejects.toMatchObject({ code: "42501" });
  await user();
  await expect(
    db.query("SELECT public.tm_record_domain_dns_proof($1,$2,$3,2,now(),$4)", [
      operator,
      domain,
      challenge.id,
      "a".repeat(64),
    ]),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    db.exec("INSERT INTO public.tm_domain_dns_proofs DEFAULT VALUES"),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(db.exec("SELECT * FROM public.tm_domain_dns_proofs")).rejects.toMatchObject({
    code: "42501",
  });
});
it("DNS mismatch never calls private persistence and leaves challenge available", async () => {
  const persist = vi.fn(record);
  const verify = createPersistedDnsVerifier(
    { read, record: persist },
    { timeoutMs: 1000 },
    async () => [["foreign"]],
  );
  await expect(verify(identity, domain)).rejects.toMatchObject({ status: 409 });
  expect(persist).not.toHaveBeenCalled();
  expect(await read()).not.toBeNull();
});
it("unknown domain and invalid caller fail before DNS", async () => {
  const lookup = vi.fn(async () => []);
  const verify = verifier(lookup);
  await expect(verify(identity, clinic)).rejects.toMatchObject({ status: 409 });
  await expect(verify({ userId: clinic, links: [] }, domain)).rejects.toMatchObject({
    status: 403,
  });
  await expect(verify(identity, "invalid")).rejects.toMatchObject({ status: 400 });
  expect(lookup).not.toHaveBeenCalled();
});
it("invalid or foreign stored state and mismatched persistence receipts are rejected", async () => {
  const state = await read();
  const lookup = vi.fn(async () => [[domainChallengeRecord(challenge).value]]);
  const persist = vi.fn(async (_actor: AuthenticatedIdentity, p: DnsProof) => ({
    ...p,
    clinicId: operator,
  }));
  const verify = createPersistedDnsVerifier(
    { read: async () => state, record: persist },
    { timeoutMs: 1000 },
    lookup,
  );
  await expect(verify(identity, domain)).rejects.toMatchObject({ status: 503 });
  expect(persist).toHaveBeenCalledOnce();
  const wrong = createPersistedDnsVerifier(
    { read: async () => state, record: persist },
    { timeoutMs: 1000 },
    lookup,
  );
  lookup.mockClear();
  await expect(wrong(identity, clinic)).rejects.toMatchObject({ status: 503 });
  expect(lookup).not.toHaveBeenCalled();
});
it("rejects a challenge belonging to a different reservation at database commit", async () => {
  const proof = await verifier()(identity, domain);
  const original = domain;
  await user();
  domain = (
    await db.query<{ saved: { id: string } }>(
      "SELECT public.tm_reserve_domain($1,$2,$3) AS saved",
      [clinic, `other-${randomUUID()}.example.com`, "patient_pwa"],
    )
  ).rows[0]!.saved.id;
  await issue();
  await expect(record(identity, { ...proof, domainId: domain })).rejects.toMatchObject({
    code: "40001",
  });
  expect(original).not.toBe(domain);
});

it("expiry during lookup prevents persistence even when TXT matches", async () => {
  const verify = verifier(async () => {
    await db.exec("RESET ROLE");
    await db.query(
      "UPDATE public.tm_domain_challenges SET created_at=clock_timestamp()-interval '2 hours', expires_at=clock_timestamp()-interval '1 hour' WHERE id=$1",
      [challenge.id],
    );
    return [[domainChallengeRecord(challenge).value]];
  });
  await expect(verify(identity, domain)).rejects.toMatchObject({ status: 409 });
  expect(
    (await db.query("SELECT * FROM public.tm_domain_dns_proofs WHERE domain_id=$1", [domain])).rows,
  ).toEqual([]);
  expect(await read()).toBeNull();
});
it("database rejects impossible timestamps and malformed digest without consuming", async () => {
  const state = (await read()) as { domain: unknown; challenge: DomainChallenge };
  const persist = vi.fn(async (_actor: AuthenticatedIdentity, proof: DnsProof) => proof);
  const proof = await createPersistedDnsVerifier(
    { read: async () => state, record: persist },
    { timeoutMs: 1000 },
    async () => [[domainChallengeRecord(challenge).value]],
  )(identity, domain);
  await expect(
    record(identity, { ...proof, dnsVerifiedAt: "2098-01-01T00:00:00Z" }),
  ).rejects.toMatchObject({ code: "40001" });
  await expect(
    record(identity, { ...proof, dnsVerifiedAt: "2020-01-01T00:00:00Z" }),
  ).rejects.toMatchObject({ code: "40001" });
  await expect(record(identity, { ...proof, proofDigest: "invalid" })).rejects.toMatchObject({
    code: "22023",
  });
  expect(await read()).not.toBeNull();
});
it("sanitizes storage errors and rejects malformed saved receipts", async () => {
  const lookup = async () => [[domainChallengeRecord(challenge).value]];
  const failed = createPersistedDnsVerifier(
    {
      read,
      record: async () => {
        throw new Error(challenge.token);
      },
    },
    { timeoutMs: 1000 },
    lookup,
  );
  await expect(failed(identity, domain)).rejects.toMatchObject({
    status: 503,
    message: "Domain proof persistence unavailable",
  });
  const malformed = createPersistedDnsVerifier(
    { read, record: async () => ({ status: "active" }) },
    { timeoutMs: 1000 },
    lookup,
  );
  await expect(malformed(identity, domain)).rejects.toMatchObject({ status: 503 });
});

it("recovers committed proof after lost response without repeating DNS and reports rotation", async () => {
  const proof = await verifier()(identity, domain);
  await user();
  const receipt = async () =>
    (
      await db.query<{ saved: { proof: unknown; isCurrent: boolean; isValid: boolean } }>(
        "SELECT public.tm_read_domain_dns_proof($1,$2) AS saved",
        [domain, proof.challengeId],
      )
    ).rows[0]!.saved;
  const saved = await receipt();
  expect(saved).toMatchObject({
    proof: { challengeId: proof.challengeId, proofDigest: proof.proofDigest },
    isCurrent: true,
    isValid: true,
  });
  expect(JSON.stringify(saved)).not.toContain(challenge.token);
  await issue(2);
  expect(await receipt()).toMatchObject({ isCurrent: false, isValid: false });
});
it("receipt read enforces operator and exact domain/challenge, with null for unknown receipt", async () => {
  const proof = await verifier()(identity, domain);
  await user();
  expect(
    (
      await db.query<{ saved: unknown }>("SELECT public.tm_read_domain_dns_proof($1,$2) AS saved", [
        clinic,
        proof.challengeId,
      ])
    ).rows[0]!.saved,
  ).toBeNull();
  await user(clinic);
  await expect(
    db.query("SELECT public.tm_read_domain_dns_proof($1,$2)", [domain, proof.challengeId]),
  ).rejects.toMatchObject({ code: "42501" });
  await user("", "anon");
  await expect(
    db.query("SELECT public.tm_read_domain_dns_proof($1,$2)", [domain, proof.challengeId]),
  ).rejects.toMatchObject({ code: "42501" });
});
