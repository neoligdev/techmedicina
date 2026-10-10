// @vitest-environment node
import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import {
  decryptClinicalText,
  encryptClinicalText,
  ClinicalCryptoError,
  CLINICAL_CRYPTO_LIMITS,
  type ClinicalCryptoContext,
  type ClinicalEnvelope,
  type ClinicalKeyProvider,
} from "../lib/security/clinical-crypto.server";

const GENERIC = "ClinicalCryptoError: falha na operacao de criptografia clinica";

const CONTEXT: ClinicalCryptoContext = {
  clinicId: "clinica-A",
  patientId: "paciente-1",
  recordId: "registro-1",
  recordType: "evolucao",
};

function b64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

async function genKey(
  length = 256,
  extractable = false,
  usages: KeyUsage[] = ["encrypt", "decrypt"],
): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length },
    extractable,
    usages,
  ) as Promise<CryptoKey>;
}

function makeProvider(
  entries: Array<[string, CryptoKey]>,
  activeKid?: string,
): ClinicalKeyProvider {
  const map = new Map(entries);
  return {
    async getActiveKey() {
      if (!activeKid) throw new Error("sem chave ativa");
      const key = map.get(activeKid);
      if (!key) throw new Error("chave ativa ausente");
      return { kid: activeKid, key };
    },
    async getKeyForKid(kid: string) {
      return map.get(kid);
    },
  };
}

async function expectCryptoFailure(fn: () => Promise<unknown>): Promise<void> {
  await expect(fn()).rejects.toBeInstanceOf(ClinicalCryptoError);
  await expect(fn()).rejects.toThrow(GENERIC);
}

async function setup(): Promise<{
  provider: ClinicalKeyProvider;
  envelope: ClinicalEnvelope;
  plaintext: string;
}> {
  const key = await genKey();
  const provider = makeProvider([["kid-a", key]], "kid-a");
  const plaintext = "Paciente: João da Silva — febre 38,5°C 🤒\nEvolução estável ✅";
  const envelope = await encryptClinicalText(provider, CONTEXT, plaintext);
  return { provider, envelope, plaintext };
}

describe("Criptografia clínica server-only (C010)", () => {
  it("faz round-trip de texto UTF-8 com acentos e emojis", async () => {
    const { provider, envelope, plaintext } = await setup();
    await expect(decryptClinicalText(provider, envelope, CONTEXT)).resolves.toBe(plaintext);
  });

  it("gera IV diferente a cada cifragem", async () => {
    const key = await genKey();
    const provider = makeProvider([["kid-a", key]], "kid-a");
    const first = await encryptClinicalText(provider, CONTEXT, "mesmo texto");
    const second = await encryptClinicalText(provider, CONTEXT, "mesmo texto");
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(Buffer.from(first.iv, "base64").byteLength).toBe(12);
  });

  it("rejeita ciphertext adulterado", async () => {
    const { provider, envelope } = await setup();
    const bytes = new Uint8Array(Buffer.from(envelope.ciphertext, "base64"));
    bytes[0] = bytes[0]! ^ 0xff;
    const tampered: ClinicalEnvelope = { ...envelope, ciphertext: b64(bytes) };
    await expectCryptoFailure(() => decryptClinicalText(provider, tampered, CONTEXT));
  });

  it("rejeita IV adulterado", async () => {
    const { provider, envelope } = await setup();
    const iv = new Uint8Array(12);
    iv[0] = 7;
    const tampered: ClinicalEnvelope = { ...envelope, iv: b64(iv) };
    await expectCryptoFailure(() => decryptClinicalText(provider, tampered, CONTEXT));
  });

  it("rejeita chave errada sob o mesmo kid", async () => {
    const { envelope } = await setup();
    const otherKey = await genKey();
    const wrongProvider = makeProvider([["kid-a", otherKey]], "kid-a");
    await expectCryptoFailure(() => decryptClinicalText(wrongProvider, envelope, CONTEXT));
  });

  it("rejeita chave desconhecida (kid ausente no provider) de forma fechada", async () => {
    const { envelope } = await setup();
    const otherKey = await genKey();
    const unknownProvider = makeProvider([["kid-b", otherKey]], "kid-b");
    await expect(unknownProvider.getKeyForKid("kid-a")).resolves.toBeUndefined();
    await expectCryptoFailure(() => decryptClinicalText(unknownProvider, envelope, CONTEXT));
  });

  it("rejeita transplante de contexto (clínica/paciente/registro/tipo)", async () => {
    const { provider, envelope } = await setup();
    const swaps: ClinicalCryptoContext[] = [
      { ...CONTEXT, clinicId: "clinica-B" },
      { ...CONTEXT, patientId: "paciente-2" },
      { ...CONTEXT, recordId: "registro-2" },
      { ...CONTEXT, recordType: "exame" },
    ];
    for (const swapped of swaps) {
      await expectCryptoFailure(() => decryptClinicalText(provider, envelope, swapped));
    }
  });

  it("rejeita envelope malformado, versão, alg, base64 e tamanhos inválidos", async () => {
    const { provider, envelope } = await setup();
    const asEnvelope = (value: unknown) => value as ClinicalEnvelope;

    await expectCryptoFailure(() =>
      decryptClinicalText(provider, asEnvelope({ ...envelope, version: 2 }), CONTEXT),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(provider, asEnvelope({ ...envelope, alg: "AES-128-GCM" }), CONTEXT),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(provider, asEnvelope({ ...envelope, iv: "nao base64!" }), CONTEXT),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(provider, asEnvelope({ ...envelope, iv: "AAAAA" }), CONTEXT),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(
        provider,
        asEnvelope({ ...envelope, iv: b64(new Uint8Array(16)) }),
        CONTEXT,
      ),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(provider, asEnvelope({ ...envelope, iv: "A".repeat(20) }), CONTEXT),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(provider, asEnvelope({ ...envelope, iv: "B".repeat(17) }), CONTEXT),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(
        provider,
        asEnvelope({ ...envelope, ciphertext: b64(new Uint8Array(8)) }),
        CONTEXT,
      ),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(provider, asEnvelope({ ...envelope, ciphertext: "A===" }), CONTEXT),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(
        provider,
        asEnvelope({
          ...envelope,
          ciphertext: "A".repeat(CLINICAL_CRYPTO_LIMITS.maxCiphertextBase64Chars + 4),
        }),
        CONTEXT,
      ),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(provider, asEnvelope({ ...envelope, kid: "" }), CONTEXT),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(provider, asEnvelope({ ...envelope, kid: "k".repeat(257) }), CONTEXT),
    );
    await expectCryptoFailure(() =>
      decryptClinicalText(provider, asEnvelope({ alg: "A256GCM", version: 1 }), CONTEXT),
    );
  });

  it("valida contexto e plaintext na entrada", async () => {
    const key = await genKey();
    const provider = makeProvider([["kid-a", key]], "kid-a");
    await expectCryptoFailure(() =>
      encryptClinicalText(provider, { ...CONTEXT, clinicId: "" }, "x"),
    );
    await expectCryptoFailure(() =>
      encryptClinicalText(provider, { ...CONTEXT, patientId: "p".repeat(257) }, "x"),
    );
    await expectCryptoFailure(() =>
      encryptClinicalText(provider, CONTEXT, "a".repeat(256 * 1024 + 1)),
    );
    await expectCryptoFailure(() =>
      encryptClinicalText(provider, CONTEXT, 42 as unknown as string),
    );
  });

  it("rejeita identificadores apenas com espaços sem normalizar ids legítimos", async () => {
    const key = await genKey();
    const provider = makeProvider([["kid-a", key]], "kid-a");
    await expectCryptoFailure(() =>
      encryptClinicalText(provider, { ...CONTEXT, clinicId: "   " }, "x"),
    );
    await expectCryptoFailure(() =>
      encryptClinicalText(provider, { ...CONTEXT, recordType: "\t\n" }, "x"),
    );
    const { envelope } = await setup();
    await expectCryptoFailure(() =>
      decryptClinicalText(provider, { ...envelope, kid: "  " }, CONTEXT),
    );
    const legal: ClinicalCryptoContext = { ...CONTEXT, clinicId: "Clinica A - Unidade 1" };
    const legalEnvelope = await encryptClinicalText(provider, legal, "evolucao");
    await expect(decryptClinicalText(provider, legalEnvelope, legal)).resolves.toBe("evolucao");
  });

  it("rejeita texto claro fora dos limites de tamanho e de UTF-8 válido", async () => {
    const { provider } = await setup();
    const maxBytes = CLINICAL_CRYPTO_LIMITS.maxPlaintextBytes;
    await expectCryptoFailure(() =>
      encryptClinicalText(provider, CONTEXT, "x".repeat(maxBytes + 1)),
    );
    await expectCryptoFailure(() =>
      encryptClinicalText(provider, CONTEXT, "y".repeat(maxBytes * 2 + 1)),
    );
    const loneSurrogate = `evolucao valida${String.fromCharCode(0xd800)}`;
    await expectCryptoFailure(() => encryptClinicalText(provider, CONTEXT, loneSurrogate));
    const envelope = await encryptClinicalText(provider, CONTEXT, "ç".repeat(1024));
    await expect(decryptClinicalText(provider, envelope, CONTEXT)).resolves.toBe("ç".repeat(1024));
  });

  it("aplica limites de ciphertext derivados no decoder e no decoder de bytes", async () => {
    const { provider, envelope } = await setup();
    const { maxCiphertextBytes, maxCiphertextBase64Chars } = CLINICAL_CRYPTO_LIMITS;
    const asEnvelope = (value: unknown) => value as ClinicalEnvelope;
    const oversizeBytes = new Uint8Array(maxCiphertextBytes + 1);
    const oversized: ClinicalEnvelope = { ...envelope, ciphertext: b64(oversizeBytes) };
    expect(oversized.ciphertext.length).toBeLessThanOrEqual(maxCiphertextBase64Chars);
    await expectCryptoFailure(() =>
      decryptClinicalText(
        provider,
        asEnvelope({ ...envelope, ciphertext: "A".repeat(maxCiphertextBase64Chars + 4) }),
        CONTEXT,
      ),
    );
    await expectCryptoFailure(() => decryptClinicalText(provider, oversized, CONTEXT));
  });

  it("captura throws síncronos do provedor sem vazar detalhes internos", async () => {
    const { envelope } = await setup();
    const syncThrow: ClinicalKeyProvider = {
      getActiveKey() {
        throw new Error("segredo: credencial-do-provedor");
      },
      getKeyForKid() {
        throw new Error("segredo: credencial-do-provedor");
      },
    };
    await expectCryptoFailure(() => encryptClinicalText(syncThrow, CONTEXT, "x"));
    await expectCryptoFailure(() => decryptClinicalText(syncThrow, envelope, CONTEXT));
  });

  it("mantém o vínculo original se o contexto for mutado durante getActiveKey", async () => {
    const key = await genKey();
    const contextCopy = { ...CONTEXT };
    const sneaky: ClinicalKeyProvider = {
      async getActiveKey() {
        contextCopy.clinicId = "clinica-B";
        contextCopy.patientId = "paciente-2";
        return { kid: "kid-a", key };
      },
      async getKeyForKid(kid) {
        return kid === "kid-a" ? key : undefined;
      },
    };
    const envelope = await encryptClinicalText(sneaky, contextCopy, "texto");
    await expect(decryptClinicalText(sneaky, envelope, { ...CONTEXT })).resolves.toBe("texto");
  });

  it("ignora mutação tardia do contexto durante getKeyForKid (snapshot)", async () => {
    const { provider, envelope, plaintext } = await setup();
    const contextCopy = { ...CONTEXT };
    const sneaky: ClinicalKeyProvider = {
      getActiveKey: () => Promise.reject(new Error("sem uso")),
      async getKeyForKid(kid) {
        contextCopy.clinicId = "clinica-B";
        return provider.getKeyForKid(kid);
      },
    };
    await expect(decryptClinicalText(sneaky, envelope, contextCopy)).resolves.toBe(plaintext);
  });

  it("mantém kid original se o objeto active for mutado durante subtle.encrypt", async () => {
    const key = await genKey();
    const active = { kid: "kid-a", key };
    const sneaky: ClinicalKeyProvider = {
      getActiveKey: () => Promise.resolve(active),
      getKeyForKid: (kid) => Promise.resolve(kid === "kid-a" ? key : undefined),
    };

    const subtleProto = Object.getPrototypeOf(crypto.subtle) as SubtleCrypto;
    const originalEncrypt = subtleProto.encrypt.bind(crypto.subtle);
    const encryptSpy = vi.spyOn(subtleProto, "encrypt");
    encryptSpy.mockImplementation(async (algorithm, keyArg, data) => {
      active.kid = "kid-b";
      active.key = undefined as unknown as CryptoKey;
      return originalEncrypt(algorithm, keyArg, data);
    });

    try {
      const envelope = await encryptClinicalText(sneaky, CONTEXT, "texto");
      expect(envelope.kid).toBe("kid-a");
      await expect(decryptClinicalText(sneaky, envelope, CONTEXT)).resolves.toBe("texto");
    } finally {
      encryptSpy.mockRestore();
    }
  });

  it("ignora mutação tardia do envelope durante getKeyForKid (snapshot)", async () => {
    const { provider, envelope, plaintext } = await setup();
    const envelopeCopy: ClinicalEnvelope = { ...envelope };
    const sneaky: ClinicalKeyProvider = {
      getActiveKey: () => Promise.reject(new Error("sem uso")),
      async getKeyForKid(kid) {
        envelopeCopy.kid = "kid-b";
        envelopeCopy.ciphertext = "C".repeat(envelopeCopy.ciphertext.length);
        return provider.getKeyForKid(kid);
      },
    };
    await expect(decryptClinicalText(sneaky, envelopeCopy, CONTEXT)).resolves.toBe(plaintext);
  });

  it("não propaga ClinicalCryptoError do provedor (mensagem adulterada)", async () => {
    const { envelope } = await setup();
    const SECRET = "segredo-que-nao-pode-vazar-123456";
    const leaky: ClinicalKeyProvider = {
      async getActiveKey() {
        const error = new ClinicalCryptoError();
        error.message = `ClinicalCryptoError: ${SECRET}`;
        throw error;
      },
      async getKeyForKid() {
        const error = new ClinicalCryptoError();
        error.message = `ClinicalCryptoError: ${SECRET}`;
        throw error;
      },
    };
    const encryptError = await encryptClinicalText(leaky, CONTEXT, "x").catch((e) => e);
    expect(encryptError).toBeInstanceOf(ClinicalCryptoError);
    expect(encryptError.message).toBe(GENERIC);
    expect(encryptError.message).not.toContain(SECRET);

    const decryptError = await decryptClinicalText(leaky, envelope, CONTEXT).catch((e) => e);
    expect(decryptError).toBeInstanceOf(ClinicalCryptoError);
    expect(decryptError.message).toBe(GENERIC);
    expect(decryptError.message).not.toContain(SECRET);
  });

  it("rejeita troca de kid mesmo quando dois kids resolvem para a mesma chave", async () => {
    const key = await genKey();
    const provider = makeProvider([["kid-a", key]], "kid-a");
    const envelope = await encryptClinicalText(provider, CONTEXT, "texto");
    const sameKeyProvider: ClinicalKeyProvider = {
      getActiveKey: () => Promise.reject(new Error("sem uso")),
      async getKeyForKid(kid) {
        return kid === "kid-a" || kid === "kid-b" ? key : undefined;
      },
    };
    await expect(
      decryptClinicalText(sameKeyProvider, { ...envelope, kid: "kid-a" }, CONTEXT),
    ).resolves.toBe("texto");
    await expectCryptoFailure(() =>
      decryptClinicalText(sameKeyProvider, { ...envelope, kid: "kid-b" }, CONTEXT),
    );
  });

  it("rejeita chave com usages/algorithm malformado sem vazar TypeError", async () => {
    const { envelope } = await setup();
    const malformed = {
      type: "secret",
      extractable: false,
      algorithm: { name: "AES-GCM", length: 256 },
    } as unknown as CryptoKey;
    const noUsages = makeProvider([["kid-a", malformed]], "kid-a");
    await expectCryptoFailure(() => encryptClinicalText(noUsages, CONTEXT, "x"));
    await expectCryptoFailure(() => decryptClinicalText(noUsages, envelope, CONTEXT));

    const missingAlgorithm = {
      type: "secret",
      extractable: false,
      usages: ["encrypt", "decrypt"],
    } as unknown as CryptoKey;
    const badAlgo = makeProvider([["kid-a", missingAlgorithm]], "kid-a");
    await expectCryptoFailure(() => encryptClinicalText(badAlgo, CONTEXT, "x"));
    await expectCryptoFailure(() => decryptClinicalText(badAlgo, envelope, CONTEXT));
  });

  it("exige chave AES-GCM de 256 bits, não extraível e com usos de encrypt/decrypt", async () => {
    const key128 = await genKey(128);
    const encryptOnly = await genKey(256, false, ["encrypt"]);
    const extractable = await genKey(256, true, ["encrypt", "decrypt"]);
    const hmac = (await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
      "verify",
    ])) as CryptoKey;

    for (const key of [key128, encryptOnly, extractable, hmac]) {
      const provider = makeProvider([["kid-a", key]], "kid-a");
      await expectCryptoFailure(() => encryptClinicalText(provider, CONTEXT, "x"));
    }

    const { envelope } = await setup();
    const decryptProvider = makeProvider([["kid-a", key128]], "kid-a");
    await expectCryptoFailure(() => decryptClinicalText(decryptProvider, envelope, CONTEXT));
  });

  it("rotaciona chaves: cifra com a ativa e decifra pelo kid do envelope", async () => {
    const oldKey = await genKey();
    const newKey = await genKey();
    const oldProvider = makeProvider([["kid-old", oldKey]], "kid-old");
    const legacy = await encryptClinicalText(oldProvider, CONTEXT, "evolucao antiga");

    const rotating = makeProvider(
      [
        ["kid-old", oldKey],
        ["kid-new", newKey],
      ],
      "kid-new",
    );
    const fresh = await encryptClinicalText(rotating, CONTEXT, "evolucao nova");
    expect(fresh.kid).toBe("kid-new");

    await expect(decryptClinicalText(rotating, legacy, CONTEXT)).resolves.toBe("evolucao antiga");
    await expect(decryptClinicalText(rotating, fresh, CONTEXT)).resolves.toBe("evolucao nova");

    const onlyOld = makeProvider([["kid-old", oldKey]], "kid-old");
    await expectCryptoFailure(() => decryptClinicalText(onlyOld, fresh, CONTEXT));
  });

  it("falha de forma genérica e sem vazar texto, ids ou chaves", async () => {
    const { envelope, plaintext } = await setup();
    const key = await genKey();
    const failing: ClinicalKeyProvider = {
      async getActiveKey() {
        throw new Error("provider indisponivel");
      },
      async getKeyForKid() {
        throw new Error("provider indisponivel");
      },
    };
    await expectCryptoFailure(() => encryptClinicalText(failing, CONTEXT, "x"));
    await expectCryptoFailure(() => decryptClinicalText(failing, envelope, CONTEXT));

    const wrongProvider = makeProvider([["kid-a", key]], "kid-a");
    const error = await decryptClinicalText(wrongProvider, envelope, CONTEXT).catch((e) => e);
    expect(error).toBeInstanceOf(ClinicalCryptoError);
    expect(error.message).toBe(GENERIC);
    expect(error.message).not.toContain(CONTEXT.patientId);
    expect(error.message).not.toContain(plaintext.slice(0, 6));
    expect(error.message).not.toContain("kid-a");
  });
});
