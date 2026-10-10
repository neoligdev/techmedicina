import "@tanstack/react-start/server-only";
import { Buffer } from "node:buffer";

/**
 * Criptografia clínica server-only (C010).
 *
 * Escopo deliberadamente delimitado: este módulo apenas cifra/decifra texto
 * clínico com a WebCrypto nativa do runtime (AES-256-GCM). Ele NÃO persiste,
 * NÃO expõe endpoint, NÃO integra banco/API/frontend e NÃO cria chaves.
 *
 * Fronteira de confiança: o `contexto` (clínica/paciente/registro) deve vir de
 * uma camada de servidor já autorizada. Nunca monte o contexto a partir de
 * entrada do navegador nem trate a demo como ambiente multitenant seguro.
 *
 * Especificações de referência:
 * - https://www.w3.org/TR/webcrypto/
 * - https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams
 *
 * Limite de segurança: o AAD impede o transplante de um ciphertext para outro
 * contexto (clínica/paciente/registro/tipo/kid), mas NÃO impede replay do mesmo
 * registro no mesmo contexto. Anti-replay real exige versão no banco e
 * auditoria em etapas futuras.
 */

const ENVELOPE_VERSION = 1 as const;
const ALGORITHM = "A256GCM" as const;
const KEY_ALGORITHM_NAME = "AES-GCM" as const;
const KEY_BIT_LENGTH = 256 as const;
const IV_BYTE_LENGTH = 12 as const;
const IV_BASE64_LENGTH = 16 as const;
const GCM_TAG_BYTE_LENGTH = 16 as const;
const GCM_TAG_BIT_LENGTH = 128 as const;

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

const MAX_PLAINTEXT_BYTES = 256 * 1024;
const MAX_CIPHERTEXT_BYTES = MAX_PLAINTEXT_BYTES + GCM_TAG_BYTE_LENGTH;
const MAX_CIPHERTEXT_BASE64_CHARS = Math.ceil(MAX_CIPHERTEXT_BYTES / 3) * 4;

/**
 * Limites técnicos documentados, avaliados antes de decodificar/operar.
 * - maxIdentifierLength: tamanho máximo de clínica/paciente/registro/tipo/kid
 *   (em code units UTF-16).
 * - maxPlaintextBytes: tamanho máximo do texto claro em bytes UTF-8.
 * - maxCiphertextBytes: derivado de maxPlaintextBytes + tag GCM (16 bytes);
 *   é o maior tamanho decodificado aceito para o campo ciphertext.
 * - maxCiphertextBase64Chars: derivado de maxCiphertextBytes; é o maior
 *   comprimento base64 canônico aceito antes de qualquer decodificação.
 */
export const CLINICAL_CRYPTO_LIMITS = {
  maxIdentifierLength: 256,
  maxPlaintextBytes: MAX_PLAINTEXT_BYTES,
  maxCiphertextBytes: MAX_CIPHERTEXT_BYTES,
  maxCiphertextBase64Chars: MAX_CIPHERTEXT_BASE64_CHARS,
} as const;

const GENERIC_MESSAGE = "ClinicalCryptoError: falha na operacao de criptografia clinica";

/** Erro genérico: nunca inclui texto, identificadores ou material de chave. */
export class ClinicalCryptoError extends Error {
  constructor() {
    super(GENERIC_MESSAGE);
    this.name = "ClinicalCryptoError";
  }
}

function fail(): never {
  throw new ClinicalCryptoError();
}

export interface ClinicalCryptoContext {
  clinicId: string;
  patientId: string;
  recordId: string;
  recordType: string;
}

export interface ActiveClinicalKey {
  kid: string;
  key: CryptoKey;
}

/**
 * Provedor de chaves obrigatório e injetado. O módulo nunca cria chaves nem
 * usa chave default. A rotação é resolvida pelo `kid` do envelope:
 * `getActiveKey` para cifrar, `getKeyForKid` para decifrar.
 *
 * Os métodos podem rejeitar assíncronamente ou lançar sincronicamente; ambos
 * são convertidos em `ClinicalCryptoError` (sem vazar detalhes internos).
 */
export interface ClinicalKeyProvider {
  getActiveKey(): Promise<ActiveClinicalKey>;
  getKeyForKid(kid: string): Promise<CryptoKey | undefined>;
}

export interface ClinicalEnvelope {
  version: typeof ENVELOPE_VERSION;
  alg: typeof ALGORITHM;
  kid: string;
  /** base64 canônico de exatamente 12 bytes (16 caracteres), sem padding. */
  iv: string;
  /** base64 canônico de ciphertext GCM com tag de 16 bytes anexada. */
  ciphertext: string;
}

function assertIdentifier(value: unknown): asserts value is string {
  if (typeof value !== "string") fail();
  if (value.length === 0) fail();
  if (value.length > CLINICAL_CRYPTO_LIMITS.maxIdentifierLength) fail();
  if (value.trim().length === 0) fail();
}

function snapshotContext(context: ClinicalCryptoContext): ClinicalCryptoContext {
  return {
    clinicId: context.clinicId,
    patientId: context.patientId,
    recordId: context.recordId,
    recordType: context.recordType,
  };
}

function snapshotEnvelope(envelope: ClinicalEnvelope): ClinicalEnvelope {
  return {
    version: envelope.version,
    alg: envelope.alg,
    kid: envelope.kid,
    iv: envelope.iv,
    ciphertext: envelope.ciphertext,
  };
}

function assertValidContext(context: ClinicalCryptoContext): void {
  if (!context || typeof context !== "object") fail();
  assertIdentifier(context.clinicId);
  assertIdentifier(context.patientId);
  assertIdentifier(context.recordId);
  assertIdentifier(context.recordType);
}

function assertValidAesGcm256Key(key: CryptoKey | undefined): asserts key is CryptoKey {
  try {
    if (!key || typeof key !== "object") fail();
    if (typeof key.type !== "string") fail();
    if (key.type !== "secret") fail();
    if (key.extractable !== false) fail();
    if (typeof key.algorithm !== "object" || key.algorithm === null) fail();
    const algorithm = key.algorithm as AesKeyAlgorithm;
    if (algorithm.name !== KEY_ALGORITHM_NAME) fail();
    if (algorithm.length !== KEY_BIT_LENGTH) fail();
    const usages: unknown = key.usages;
    if (!Array.isArray(usages)) fail();
    if (!usages.includes("encrypt") || !usages.includes("decrypt")) fail();
  } catch {
    fail();
  }
}

function decodeBase64Canonical(encoded: unknown): Uint8Array<ArrayBuffer> {
  if (typeof encoded !== "string") fail();
  if (encoded.length === 0) fail();
  if (encoded.length % 4 !== 0) fail();
  if (!BASE64_PATTERN.test(encoded)) fail();
  const bytes = Buffer.from(encoded, "base64");
  if (Buffer.from(bytes).toString("base64") !== encoded) fail();
  return fixedBytes(bytes);
}

function encodeBase64Canonical(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fixedBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out;
}

function buildAdditionalData(
  version: number,
  alg: string,
  kid: string,
  context: ClinicalCryptoContext,
): Uint8Array<ArrayBuffer> {
  const payload = JSON.stringify([
    version,
    alg,
    kid,
    context.clinicId,
    context.patientId,
    context.recordId,
    context.recordType,
  ]);
  return fixedBytes(TEXT_ENCODER.encode(payload));
}

/**
 * Cifra um texto clínico em UTF-8. Usa o `kid` ativo do provedor e gera um IV
 * aleatório novo (12 bytes) a cada chamada. Um snapshot validado de contexto e
 * kid é tomado antes de qualquer `await`, de modo que mutações tardias (feitas
 * durante a resolução do provedor) não alteram o vínculo AAD.
 */
export async function encryptClinicalText(
  provider: ClinicalKeyProvider,
  context: ClinicalCryptoContext,
  plaintext: string,
): Promise<ClinicalEnvelope> {
  if (!provider || typeof provider.getActiveKey !== "function") fail();
  // Snapshot do contexto ANTES de consultar o provedor: validações e AAD usam
  // esta cópia imutável, nunca o objeto original que pode ser mutado antes ou
  // durante os awaits seguintes.
  assertValidContext(context);
  const ctx = snapshotContext(context);

  if (typeof plaintext !== "string") fail();
  // Para texto UTF-8 válido, bytes >= unidades UTF-16; o pré-limite em unidades
  // é seguro e evita alocação desnecessária antes de medir os bytes.
  if (plaintext.length > CLINICAL_CRYPTO_LIMITS.maxPlaintextBytes) fail();

  let plainBytes: Uint8Array<ArrayBuffer>;
  try {
    plainBytes = fixedBytes(TEXT_ENCODER.encode(plaintext));
    if (TEXT_DECODER.decode(plainBytes) !== plaintext) fail();
  } catch {
    fail();
  }
  if (plainBytes.byteLength > CLINICAL_CRYPTO_LIMITS.maxPlaintextBytes) fail();

  let active: ActiveClinicalKey;
  try {
    active = await provider.getActiveKey();
  } catch {
    fail();
  }
  if (!active || typeof active !== "object") fail();
  // Snapshot do kid e da chave DEPOIS do provedor e ANTES de qualquer await de
  // criptografia: o objeto `active` devolvido pode ser mutado pelo provedor ou
  // por terceiros enquanto o subtle.encrypt estiver em andamento; o envelope e
  // o AAD devem usar sempre o `kid` resolvido neste instante.
  const kid = active.kid;
  const key = active.key;
  assertIdentifier(kid);
  assertValidAesGcm256Key(key);

  const iv = new Uint8Array(IV_BYTE_LENGTH);
  crypto.getRandomValues(iv);

  const additionalData = buildAdditionalData(ENVELOPE_VERSION, ALGORITHM, kid, ctx);

  let cipherBuffer: ArrayBuffer;
  try {
    cipherBuffer = await crypto.subtle.encrypt(
      { name: KEY_ALGORITHM_NAME, iv, additionalData, tagLength: GCM_TAG_BIT_LENGTH },
      key,
      plainBytes,
    );
  } catch {
    fail();
  }

  return {
    version: ENVELOPE_VERSION,
    alg: ALGORITHM,
    kid,
    iv: encodeBase64Canonical(iv),
    ciphertext: encodeBase64Canonical(new Uint8Array(cipherBuffer)),
  };
}

/**
 * Decifra um envelope. Resolve a chave pelo `kid` do envelope e falha de forma
 * fechada (erro genérico) se o provedor estiver indisponível, a chave for
 * desconhecida, o envelope estiver malformado (incluindo IV que não tenha
 * exatamente 16 caracteres base64) ou o AAD não corresponder.
 */
export async function decryptClinicalText(
  provider: ClinicalKeyProvider,
  envelope: ClinicalEnvelope,
  context: ClinicalCryptoContext,
): Promise<string> {
  if (!provider || typeof provider.getKeyForKid !== "function") fail();
  // Snapshot do contexto ANTES de consultar o provedor (ver encryptClinicalText).
  assertValidContext(context);
  const ctx = snapshotContext(context);

  if (!envelope || typeof envelope !== "object") fail();
  if (envelope.version !== ENVELOPE_VERSION) fail();
  if (envelope.alg !== ALGORITHM) fail();
  assertIdentifier(envelope.kid);
  // Snapshot do envelope antes do provedor e dos awaits de criptografia.
  const env = snapshotEnvelope(envelope);

  if (typeof env.ciphertext !== "string") fail();
  if (env.ciphertext.length === 0) fail();
  if (env.ciphertext.length > CLINICAL_CRYPTO_LIMITS.maxCiphertextBase64Chars) fail();

  if (typeof env.iv !== "string") fail();
  if (env.iv.length !== IV_BASE64_LENGTH) fail();

  const iv = decodeBase64Canonical(env.iv);
  if (iv.byteLength !== IV_BYTE_LENGTH) fail();

  const cipherBytes = decodeBase64Canonical(env.ciphertext);
  if (cipherBytes.byteLength < GCM_TAG_BYTE_LENGTH) fail();
  if (cipherBytes.byteLength > CLINICAL_CRYPTO_LIMITS.maxCiphertextBytes) fail();

  let key: CryptoKey | undefined;
  try {
    key = await provider.getKeyForKid(env.kid);
  } catch {
    fail();
  }
  if (!key) fail();
  assertValidAesGcm256Key(key);

  const additionalData = buildAdditionalData(ENVELOPE_VERSION, ALGORITHM, env.kid, ctx);

  let plainBuffer: ArrayBuffer;
  try {
    plainBuffer = await crypto.subtle.decrypt(
      { name: KEY_ALGORITHM_NAME, iv, additionalData, tagLength: GCM_TAG_BIT_LENGTH },
      key,
      cipherBytes,
    );
  } catch {
    fail();
  }

  try {
    return TEXT_DECODER.decode(plainBuffer);
  } catch {
    fail();
  }
}
