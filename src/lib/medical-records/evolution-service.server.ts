import "@tanstack/react-start/server-only";
import {
  evolutionCommandSchema,
  evolutionScopeSchema,
  evolutionAuthorSchema,
  evolutionPayloadSchema,
  encryptedEvolutionSchema,
  type EncryptedEvolution,
} from "@/features/medical-records/evolution-contract";
import {
  encryptClinicalText,
  decryptClinicalText,
  type ClinicalKeyProvider,
} from "@/lib/security/clinical-crypto.server";
/** Local core only. No default identity, key provider, database connection or HTTP endpoint. */
export function createMedicalEvolutionService(providers: {
  authorize: (
    scope: { clinicId: string; patientId: string },
    action: "read" | "create",
  ) => Promise<unknown>;
  keys: ClinicalKeyProvider;
  read: (scope: { clinicId: string; patientId: string }, id: string) => Promise<unknown>;
  append: (record: EncryptedEvolution) => Promise<unknown>;
  now: () => string;
}) {
  const context = (record: Pick<EncryptedEvolution, "clinicId" | "patientId" | "id">) => ({
    clinicId: record.clinicId,
    patientId: record.patientId,
    recordId: record.id,
    recordType: "medical_evolution",
  });
  const open = async (
    value: unknown,
    scope: { clinicId: string; patientId: string },
    id: string,
  ) => {
    const record = encryptedEvolutionSchema.parse(value);
    if (
      record.clinicId !== scope.clinicId ||
      record.patientId !== scope.patientId ||
      record.id !== id
    )
      throw new Error("Unexpected medical record");
    const payload = evolutionPayloadSchema.parse(
      JSON.parse(await decryptClinicalText(providers.keys, record.envelope, context(record))),
    );
    if (
      payload.author.userId !== record.authorUserId ||
      payload.recordedAt !== record.recordedAt ||
      payload.supplementsId !== record.supplementsId
    )
      throw new Error("Unexpected medical metadata");
    return payload;
  };
  return {
    async read(scopeValue: unknown, idValue: unknown) {
      const scope = evolutionScopeSchema.parse(scopeValue),
        id = evolutionCommandSchema.shape.id.parse(idValue);
      const reader = evolutionAuthorSchema.parse(await providers.authorize({ ...scope }, "read"));
      const value = await providers.read({ ...scope }, id);
      if (value === null) return null;
      const payload = await open(value, scope, id);
      // A late revocation must not release decrypted text from an earlier authorization.
      if (
        evolutionAuthorSchema.parse(await providers.authorize({ ...scope }, "read")).userId !==
        reader.userId
      )
        throw new Error("Medical session changed");
      return { id, ...scope, ...payload };
    },
    async create(scopeValue: unknown, commandValue: unknown) {
      const scope = evolutionScopeSchema.parse(scopeValue),
        command = evolutionCommandSchema.parse(commandValue);
      const author = evolutionAuthorSchema.parse(await providers.authorize({ ...scope }, "create"));
      const payload = evolutionPayloadSchema.parse({
        text: command.text,
        author,
        recordedAt: new Date(
          evolutionPayloadSchema.shape.recordedAt.parse(providers.now()),
        ).toISOString(),
        supplementsId: command.supplementsId,
      });
      const id = command.id;
      const draft = {
        ...scope,
        id,
        authorUserId: author.userId,
        recordedAt: payload.recordedAt,
        supplementsId: command.supplementsId,
      };
      const envelope = await encryptClinicalText(
        providers.keys,
        context(draft),
        JSON.stringify(payload),
      );
      const currentAuthor = evolutionAuthorSchema.parse(
        await providers.authorize({ ...scope }, "create"),
      );
      if (JSON.stringify(currentAuthor) !== JSON.stringify(author))
        throw new Error("Medical identity changed");
      const saved = await open(await providers.append({ ...draft, envelope }), scope, id);
      // SQL returns an existing immutable occurrence on conflict. Confirm its original command.
      if (
        saved.author.userId !== author.userId ||
        saved.text !== command.text ||
        saved.supplementsId !== command.supplementsId
      )
        throw new Error("Medical record command conflict");
      if (
        evolutionAuthorSchema.parse(await providers.authorize({ ...scope }, "read")).userId !==
        author.userId
      )
        throw new Error("Medical session changed");
      return { id, ...scope, ...saved };
    },
  };
}
