// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, it, expect } from "vitest";
import type { DomainChallenge } from "@/lib/white-label/domain-possession.server";
let db: PGlite;
const operator = "00000000-0000-4000-8000-000000000001";
const clinic = "00000000-0000-4000-8000-000000000002";
let domain: string;
async function user(id: string, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`SET ROLE ${role === "anon" ? "anon" : "authenticated"}`);
}
async function issue(
  revision: number,
  token = "a".repeat(64),
  expires = "2099-01-01T00:00:00Z",
  id = domain,
) {
  return (
    await db.query<{ saved: DomainChallenge }>(
      "SELECT public.tm_issue_domain_challenge($1,$2,$3,$4) AS saved",
      [id, revision, token, expires],
    )
  ).rows[0]!.saved;
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
  ])
    await db.exec(
      await readFile(new URL(`../../database/migrations/${file}`, import.meta.url), "utf8"),
    );
  await db.query("INSERT INTO public.tm_clinics(id,name) VALUES($1,'QA')", [clinic]);
  await db.query(
    "INSERT INTO public.tm_platform_operators(user_id,role,is_active) VALUES($1,'super_admin',true)",
    [operator],
  );
  await user(operator);
  domain = (
    await db.query<{ saved: { id: string } }>(
      "SELECT public.tm_reserve_domain($1,$2,$3) AS saved",
      [clinic, "portal.qa.example.com", "clinic_portal"],
    )
  ).rows[0]!.saved.id;
}, 30000);
afterAll(async () => {
  await db?.close();
});
it("issues a persisted exact-tenant challenge and rotates it with optimistic revision", async () => {
  const first = await issue(1);
  expect(first).toMatchObject({
    domainId: domain,
    clinicId: clinic,
    hostname: "portal.qa.example.com",
    environment: "clinic_portal",
    revision: 2,
  });
  const second = await issue(2, "b".repeat(64));
  expect(second.id).not.toBe(first.id);
  expect(second.revision).toBe(3);
  await expect(issue(2, "c".repeat(64))).rejects.toMatchObject({ code: "40001" });
  await db.exec("RESET ROLE");
  const rows = (
    await db.query<{ id: string; revoked_at: string | null }>(
      "SELECT id,revoked_at FROM public.tm_domain_challenges ORDER BY created_at",
    )
  ).rows;
  expect(rows).toHaveLength(2);
  expect(rows[0]!.revoked_at).not.toBeNull();
  expect(rows[1]!.revoked_at).toBeNull();
  await user(operator);
  expect(
    (await db.query("SELECT status,revision FROM public.tm_clinic_domains WHERE id=$1", [domain]))
      .rows,
  ).toEqual([{ status: "pending_verification", revision: 3 }]);
});
it("failed duplicate token rolls back revocation, revision and audit", async () => {
  await expect(issue(3, "a".repeat(64))).rejects.toMatchObject({ code: "23505" });
  expect(
    (await db.query("SELECT revision FROM public.tm_clinic_domains WHERE id=$1", [domain])).rows[0],
  ).toEqual({ revision: 3 });
  const audit = (
    await db.query<{ action: string }>(
      "SELECT action FROM public.tm_domain_challenge_audit WHERE domain_id=$1 ORDER BY occurred_at",
      [domain],
    )
  ).rows;
  expect(audit.map((x) => x.action)).toEqual(["challenge_issued", "challenge_rotated"]);
  expect(JSON.stringify(audit)).not.toContain("b".repeat(64));
});
it("operators cannot read tokens or mutate challenge/domain tables directly", async () => {
  for (const sql of [
    "SELECT * FROM public.tm_domain_challenges",
    "DELETE FROM public.tm_domain_challenges",
    "UPDATE public.tm_clinic_domains SET status='active'",
  ])
    await expect(db.exec(sql)).rejects.toMatchObject({ code: "42501" });
});
it("rejects missing domain, stale revision, invalid tokens and expiry without writes", async () => {
  await expect(issue(3, "x".repeat(64))).rejects.toMatchObject({ code: "22023" });
  await expect(issue(3, "d".repeat(64), "2020-01-01Z")).rejects.toMatchObject({ code: "22023" });
  await expect(issue(3, "d".repeat(64), "infinity")).rejects.toMatchObject({ code: "22023" });
  await expect(issue(3, "d".repeat(64), "2099-01-01Z", clinic)).rejects.toMatchObject({
    code: "40001",
  });
});
it("keeps two clinics and PWA/portal challenges separate without clinical grants", async () => {
  await db.exec("RESET ROLE");
  const secondClinic = "00000000-0000-4000-8000-000000000003";
  await db.query("INSERT INTO public.tm_clinics(id,name) VALUES($1,'QA B')", [secondClinic]);
  await user(operator);
  const otherDomain = (
    await db.query<{ saved: { id: string } }>(
      "SELECT public.tm_reserve_domain($1,$2,$3) AS saved",
      [secondClinic, "app.second.example.com", "patient_pwa"],
    )
  ).rows[0]!.saved.id;
  const other = await issue(1, "e".repeat(64), "2099-01-01Z", otherDomain);
  expect(other).toMatchObject({
    domainId: otherDomain,
    clinicId: secondClinic,
    environment: "patient_pwa",
    revision: 2,
  });
  expect(
    (await db.query("SELECT revision FROM public.tm_clinic_domains WHERE id=$1", [domain])).rows[0],
  ).toEqual({ revision: 3 });
  await user(secondClinic);
  expect((await db.query("SELECT * FROM public.tm_domain_challenge_audit")).rows).toEqual([]);
  await expect(db.exec("SELECT * FROM public.tm_domain_challenges")).rejects.toMatchObject({
    code: "42501",
  });
  await user(operator);
});
it.each(["127.0.0.2", "app.local", "app.lovable.app"])(
  "rejects challenge for non-operational host %s",
  async (host) => {
    const reserved = (
      await db.query<{ saved: { id: string } }>(
        "SELECT public.tm_reserve_domain($1,$2,$3) AS saved",
        [clinic, host, "patient_pwa"],
      )
    ).rows[0]!.saved.id;
    await expect(issue(1, "f".repeat(64), "2099-01-01Z", reserved)).rejects.toMatchObject({
      code: "22023",
    });
    expect(
      (await db.query("SELECT revision FROM public.tm_clinic_domains WHERE id=$1", [reserved]))
        .rows[0],
    ).toEqual({ revision: 1 });
  },
);
it("ordinary, anonymous and revoked operators cannot issue", async () => {
  await user(clinic);
  await expect(issue(3)).rejects.toMatchObject({ code: "42501" });
  await user("", "anon");
  await expect(issue(3)).rejects.toMatchObject({ code: "42501" });
  await db.exec("RESET ROLE; UPDATE public.tm_platform_operators SET is_active=false");
  await user(operator);
  await expect(issue(3)).rejects.toMatchObject({ code: "42501" });
});
