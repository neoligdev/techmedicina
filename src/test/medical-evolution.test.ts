// @vitest-environment node
import { createMedicalEvolutionEndpoint } from "@/lib/medical-records/evolution-endpoint.server";
import {
  createMedicalEvolutionHistory,
  createMedicalEvolutionHistoryStore,
} from "@/lib/medical-records/evolution-history.server";
import { createMedicalEvolutionStore } from "@/lib/medical-records/evolution-store.server";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, afterAll, it, expect, vi } from "vitest";
import { createMedicalEvolutionService } from "@/lib/medical-records/evolution-service.server";
import { encryptClinicalText } from "@/lib/security/clinical-crypto.server";
let db: PGlite;
let key: CryptoKey;
const clinic = randomUUID(),
  otherClinic = randomUUID(),
  patient = randomUUID(),
  otherPatient = randomUUID(),
  doctor = randomUUID(),
  colleague = randomUUID(),
  admin = randomUUID();
const author = { userId: doctor, name: "Médico QA fictício", crm: "QA-000", uf: "BA" };
const scope = { clinicId: clinic, patientId: patient };
const keys = {
  getActiveKey: async () => ({ kid: "ephemeral-test-only", key }),
  getKeyForKid: async () => key,
};
beforeAll(async () => {
  db = new PGlite();
  key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await db.exec(
    "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;",
  );
  await db.exec(
    await readFile(
      new URL("../../database/migrations/001_tenant_foundation.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    "CREATE ROLE inherited_reader NOLOGIN; ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO inherited_reader; ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO inherited_reader;",
  );
  await db.exec(
    await readFile(
      new URL("../../database/migrations/048_private_medical_evolutions.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../../database/migrations/049_private_medical_evolution_history.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const c of [clinic, otherClinic])
    await db.query("INSERT INTO public.tm_clinics(id,name,is_active) VALUES($1,'QA',true)", [c]);
  await db.query(
    "INSERT INTO public.tm_patients(id,clinic_id,is_active) VALUES($1,$2,true),($3,$4,true)",
    [patient, clinic, otherPatient, otherClinic],
  );
  for (const user of [doctor, colleague, admin]) {
    const member = randomUUID();
    await db.query(
      "INSERT INTO public.tm_memberships(id,clinic_id,user_id,role,is_active,medical_identity_verified) VALUES($1,$2,$3,$4,true,$5)",
      [member, clinic, user, user === admin ? "admin" : "medico", user !== admin],
    );
    await db.query(
      "INSERT INTO public.tm_membership_grants VALUES($1,'prontuario','read'),($1,'prontuario','create')",
      [member],
    );
  }
}, 30000);
beforeEach(async () => {
  await db.exec("RESET ROLE;BEGIN");
});
afterAll(async () => {
  await db.close();
});
// Roll back fixtures because definitive records themselves cannot be deleted through normal DML.
import { afterEach } from "vitest";
afterEach(async () => {
  await db.exec("RESET ROLE;ROLLBACK");
});
function setup() {
  const providers = {
    keys,
    authorize: vi.fn(async () => author),
    now: () => "2026-10-31T12:00:00.000Z",
    read: async (s: { clinicId: string; patientId: string }, id: string) =>
      (
        await db.query<{ value: unknown }>(
          "SELECT public.tm_get_medical_evolution($1,$2,$3,$4) AS value",
          [doctor, s.clinicId, s.patientId, id],
        )
      ).rows[0]!.value,
    append: async (record: unknown) =>
      (
        await db.query<{ value: unknown }>(
          "SELECT public.tm_append_medical_evolution($1,$2) AS value",
          [doctor, JSON.stringify(record)],
        )
      ).rows[0]!.value,
  };
  return { providers, service: createMedicalEvolutionService(providers) };
}
it("persists only ciphertext and decrypts the original chronology and author snapshot", async () => {
  const { service } = setup(),
    id = randomUUID();
  await service.create(scope, { id, text: "Texto clínico fictício QA", supplementsId: null });
  expect(await service.read(scope, id)).toMatchObject({
    id,
    text: "Texto clínico fictício QA",
    author,
    recordedAt: "2026-10-31T12:00:00.000Z",
  });
  const rows = await db.query("SELECT * FROM public.tm_medical_evolutions");
  expect(JSON.stringify(rows.rows)).not.toContain("Texto clínico");
  expect(JSON.stringify(rows.rows)).not.toContain(author.name);
});
it("retries the same immutable command after a lost response but refuses changed text", async () => {
  const { providers } = setup();
  const append = providers.append;
  let lost = true;
  providers.append = async (r) => {
    const result = await append(r);
    if (lost) {
      lost = false;
      throw new Error("uncertain");
    }
    return result;
  };
  const service = createMedicalEvolutionService(providers),
    command = { id: randomUUID(), text: "QA", supplementsId: null };
  await expect(service.create(scope, command)).rejects.toThrow("uncertain");
  expect(await service.create(scope, command)).toMatchObject({ text: "QA" });
  await expect(service.create(scope, { ...command, text: "Changed" })).rejects.toThrow("conflict");
  expect((await db.query("SELECT * FROM public.tm_medical_evolutions")).rows).toHaveLength(1);
});
it("refuses update/delete and allows a new linked supplement without replacing the original", async () => {
  const { service } = setup(),
    id = randomUUID();
  await service.create(scope, { id, text: "Original", supplementsId: null });
  await db.exec("SAVEPOINT immutable_update");
  await expect(
    db.query("UPDATE public.tm_medical_evolutions SET recorded_at=now() WHERE id=$1", [id]),
  ).rejects.toMatchObject({ code: "55000" });
  await db.exec("ROLLBACK TO SAVEPOINT immutable_update");
  await db.exec("SAVEPOINT immutable_delete");
  await expect(
    db.query("DELETE FROM public.tm_medical_evolutions WHERE id=$1", [id]),
  ).rejects.toMatchObject({ code: "55000" });
  await db.exec("ROLLBACK TO SAVEPOINT immutable_delete");
  await service.create(scope, { id: randomUUID(), text: "Complemento", supplementsId: id });
  expect((await service.read(scope, id))?.text).toBe("Original");
});
it("allows another authorized doctor in the same clinic but denies administrators and other clinics", async () => {
  const { service } = setup(),
    id = randomUUID();
  await service.create(scope, { id, text: "QA", supplementsId: null });
  expect(
    (
      await db.query<{ value: unknown }>(
        "SELECT public.tm_get_medical_evolution($1,$2,$3,$4) AS value",
        [colleague, clinic, patient, id],
      )
    ).rows[0]!.value,
  ).not.toBeNull();
  for (const args of [
    [admin, clinic, patient, id],
    [doctor, otherClinic, otherPatient, id],
    [doctor, clinic, otherPatient, id],
  ]) {
    await db.exec("SAVEPOINT access_check");
    await expect(
      db.query("SELECT public.tm_get_medical_evolution($1,$2,$3,$4)", args),
    ).rejects.toMatchObject({ code: "42501" });
    await db.exec("ROLLBACK TO SAVEPOINT access_check");
  }
});
it("does not release text when session changes during the read", async () => {
  const { service, providers } = setup(),
    id = randomUUID();
  await service.create(scope, { id, text: "QA", supplementsId: null });
  providers.authorize
    .mockResolvedValueOnce(author)
    .mockResolvedValueOnce({ ...author, userId: colleague });
  await expect(service.read(scope, id)).rejects.toThrow("session changed");
});
it("rejects transplanted ciphertext and does not store anything when key retrieval fails", async () => {
  const { providers } = setup();
  const envelope = await encryptClinicalText(
    keys,
    {
      clinicId: clinic,
      patientId: patient,
      recordId: randomUUID(),
      recordType: "medical_evolution",
    },
    "QA",
  );
  const id = randomUUID();
  providers.read = async () => ({
    id,
    ...scope,
    authorUserId: doctor,
    recordedAt: providers.now(),
    supplementsId: null,
    envelope,
  });
  await expect(createMedicalEvolutionService(providers).read(scope, id)).rejects.toThrow(
    "ClinicalCryptoError",
  );
  const broken = {
    ...providers,
    keys: {
      ...keys,
      getActiveKey: async () => {
        throw new Error("No key");
      },
    },
  };
  await expect(
    createMedicalEvolutionService(broken).create(scope, { id, text: "QA", supplementsId: null }),
  ).rejects.toThrow("ClinicalCryptoError");
  expect((await db.query("SELECT * FROM public.tm_medical_evolutions")).rows).toHaveLength(0);
});
it("denies inherited grants and app roles access to rows and private RPCs", async () => {
  for (const role of ["anon", "authenticated", "inherited_reader"]) {
    await db.exec("SAVEPOINT role_check");
    await db.exec(`SET ROLE ${role}`);
    await expect(db.query("SELECT * FROM public.tm_medical_evolutions")).rejects.toMatchObject({
      code: "42501",
    });
    await db.exec("ROLLBACK TO SAVEPOINT role_check;RESET ROLE");
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "SELECT has_function_privilege($1,'public.tm_get_medical_evolution(uuid,uuid,uuid,uuid)','EXECUTE') AS allowed",
          [role],
        )
      ).rows[0]!.allowed,
    ).toBe(false);
  }
});
it("rechecks revoked create grants at persistence and never stores plaintext or an empty envelope", async () => {
  const { providers } = setup();
  const append = providers.append;
  providers.append = async (r) => {
    await db.query("DELETE FROM public.tm_membership_grants WHERE action='create'");
    return append(r);
  };
  await db.exec("SAVEPOINT revoked");
  await expect(
    createMedicalEvolutionService(providers).create(scope, {
      id: randomUUID(),
      text: "QA",
      supplementsId: null,
    }),
  ).rejects.toMatchObject({ code: "42501" });
  await db.exec("ROLLBACK TO SAVEPOINT revoked");
  await db.exec("SAVEPOINT malformed");
  await expect(
    db.query(
      "INSERT INTO public.tm_medical_evolutions(id,clinic_id,patient_id,author_user_id,recorded_at,envelope) VALUES($1,$2,$3,$4,now(),'{}')",
      [randomUUID(), clinic, patient, doctor],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await db.exec("ROLLBACK TO SAVEPOINT malformed");
  expect((await db.query("SELECT * FROM public.tm_medical_evolutions")).rows).toHaveLength(0);
});
it("audits successful SQL access without clinical text and protects audit history", async () => {
  const { service } = setup(),
    command = { id: randomUUID(), text: "Conteúdo sigiloso fictício", supplementsId: null };
  await service.create(scope, command);
  await service.read(scope, command.id);
  await service.create(scope, command);
  const audit = await db.query<{ action: string }>(
    "SELECT * FROM public.tm_medical_evolution_audit ORDER BY created_at,id",
  );
  expect(audit.rows.map((r) => r.action)).toEqual(["create", "read", "replay_lookup"]);
  expect(JSON.stringify(audit.rows)).not.toContain(command.text);
  expect(JSON.stringify(audit.rows)).not.toContain(author.name);
  await db.exec("SAVEPOINT audit_immutable");
  await expect(db.query("DELETE FROM public.tm_medical_evolution_audit")).rejects.toMatchObject({
    code: "55000",
  });
  await db.exec("ROLLBACK TO SAVEPOINT audit_immutable");
});
it("uses the verified actor captured by the private SQL adapter", async () => {
  const base = setup().providers;
  const store = createMedicalEvolutionStore(doctor, async (name, args) => {
    expect(args["p_actor"]).toBe(doctor);
    if (name === "tm_append_medical_evolution")
      return (
        await db.query<{ value: unknown }>(
          "SELECT public.tm_append_medical_evolution($1,$2) AS value",
          [args["p_actor"], JSON.stringify(args["p_record"])],
        )
      ).rows[0]!.value;
    return (
      await db.query<{ value: unknown }>(
        "SELECT public.tm_get_medical_evolution($1,$2,$3,$4) AS value",
        [args["p_actor"], args["p_clinic"], args["p_patient"], args["p_id"]],
      )
    ).rows[0]!.value;
  });
  const service = createMedicalEvolutionService({ ...base, ...store }),
    id = randomUUID();
  await service.create(scope, { id, text: "QA adaptador", supplementsId: null });
  expect((await service.read(scope, id))?.text).toBe("QA adaptador");
});
function historySetup() {
  const list = createMedicalEvolutionHistoryStore(
    doctor,
    async (_name, args) =>
      (
        await db.query<{ value: unknown }>(
          "SELECT public.tm_list_medical_evolutions($1,$2,$3,$4,$5,$6) AS value",
          [
            args["p_actor"],
            args["p_clinic"],
            args["p_patient"],
            args["p_before_recorded_at"] ?? null,
            args["p_before_id"] ?? null,
            args["p_limit"],
          ],
        )
      ).rows[0]!.value,
  );
  const providers = { keys, authorize: vi.fn(async () => author), list };
  return { providers, history: createMedicalEvolutionHistory(providers) };
}
it("reads 102 encrypted evolutions in 100 plus 2, with stable tie-breaks and no plaintext in audit", async () => {
  const { service } = setup();
  for (let i = 0; i < 102; i++)
    await service.create(scope, { id: randomUUID(), text: `QA ${i}`, supplementsId: null });
  const { history } = historySetup(),
    first = await history(scope);
  expect(first.items).toHaveLength(100);
  expect(first.nextCursor).not.toBeNull();
  const second = await history(scope, first.nextCursor);
  expect(second.items).toHaveLength(2);
  expect(second.nextCursor).toBeNull();
  expect(new Set([...first.items, ...second.items].map((r) => r.id)).size).toBe(102);
  expect(first.items.every((r, i) => i === 0 || r.id < first.items[i - 1]!.id)).toBe(true);
  expect((await history(scope)).items.map((r) => r.id)).toEqual(first.items.map((r) => r.id));
  expect(
    JSON.stringify((await db.query("SELECT * FROM public.tm_medical_evolution_audit")).rows),
  ).not.toContain("QA 0");
});
it("keeps history private and rejects invalid SQL cursor pairs and limits", async () => {
  for (const role of ["anon", "authenticated", "inherited_reader"]) {
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "SELECT has_function_privilege($1,'public.tm_list_medical_evolutions(uuid,uuid,uuid,timestamptz,uuid,integer)','EXECUTE') AS allowed",
          [role],
        )
      ).rows[0]!.allowed,
    ).toBe(false);
  }
  await db.exec("SAVEPOINT bad_history");
  await expect(
    db.query("SELECT public.tm_list_medical_evolutions($1,$2,$3,NULL,$4,101)", [
      doctor,
      clinic,
      patient,
      randomUUID(),
    ]),
  ).rejects.toMatchObject({ code: "22023" });
  await db.exec("ROLLBACK TO SAVEPOINT bad_history");
  await db.exec("SAVEPOINT history_denied");
  await expect(
    db.query("SELECT public.tm_list_medical_evolutions($1,$2,$3)", [admin, clinic, patient]),
  ).rejects.toMatchObject({ code: "42501" });
  await db.exec("ROLLBACK TO SAVEPOINT history_denied");
});
it("validates every encrypted history scope before asking the key provider to decrypt", async () => {
  const { service } = setup(),
    id = randomUUID();
  await service.create(scope, { id, text: "QA", supplementsId: null });
  const raw = (
    await db.query<{ value: { items: Record<string, unknown>[]; nextCursor: null } }>(
      "SELECT public.tm_list_medical_evolutions($1,$2,$3) AS value",
      [doctor, clinic, patient],
    )
  ).rows[0]!.value;
  raw.items[0]!["patientId"] = otherPatient;
  const keyLookup = vi.fn(keys.getKeyForKid);
  const history = createMedicalEvolutionHistory({
    keys: { ...keys, getKeyForKid: keyLookup },
    authorize: async () => author,
    list: async () => raw,
  });
  await expect(history(scope)).rejects.toThrow("Unexpected medical history page");
  expect(keyLookup).not.toHaveBeenCalled();
});
it("does not release a history page after a session change", async () => {
  const { service } = setup();
  await service.create(scope, { id: randomUUID(), text: "QA", supplementsId: null });
  const { history, providers } = historySetup();
  providers.authorize
    .mockResolvedValueOnce(author)
    .mockResolvedValueOnce({ ...author, userId: colleague });
  await expect(history(scope)).rejects.toThrow("Medical session changed");
});
it("connects local HTTP create/read/history to the encrypted SQL core without exposing a route", async () => {
  const { service } = setup(),
    { history } = historySetup();
  const endpoint = createMedicalEvolutionEndpoint({
    resolveContext: async () => ({
      authContext: {
        currentClinicId: clinic,
        identity: {
          userId: doctor,
          links: [
            {
              clinicId: clinic,
              role: "medico",
              isActive: true,
              medicalIdentityVerified: true,
              grants: [
                { resource: "prontuario", action: "read" },
                { resource: "prontuario", action: "create" },
              ],
            },
          ],
        },
      },
      patientLink: { patientId: patient, clinicId: clinic, isActive: true },
    }),
    create: (_session, command) => service.create(scope, command),
    read: (_session, id) => service.read(scope, id),
    history: (_session, cursor) => history(scope, cursor),
  });
  const id = randomUUID(),
    url = "https://clinica.example.test/api/medical/evolutions";
  const created = await endpoint(
    new Request(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer qa",
        Origin: "https://clinica.example.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, text: "Fluxo HTTP QA", supplementsId: null }),
    }),
    "create",
  );
  expect(created.status).toBe(200);
  expect((await created.json()).result.author).toEqual(author);
  const read = await endpoint(
    new Request(`${url}?id=${id}`, { headers: { Authorization: "Bearer qa" } }),
    "record",
  );
  expect(read.status).toBe(200);
  expect((await read.json()).result.text).toBe("Fluxo HTTP QA");
  const page = await endpoint(
    new Request(url, { headers: { Authorization: "Bearer qa" } }),
    "history",
  );
  expect(page.status).toBe(200);
  expect((await page.json()).result.items).toHaveLength(1);
  expect(
    JSON.stringify((await db.query("SELECT * FROM public.tm_medical_evolutions")).rows),
  ).not.toContain("Fluxo HTTP QA");
});
