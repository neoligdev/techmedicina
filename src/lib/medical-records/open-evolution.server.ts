import "@tanstack/react-start/server-only";
import {
  evolutionPayloadSchema,
  encryptedEvolutionSchema,
} from "@/features/medical-records/evolution-contract";
import {
  decryptClinicalText,
  type ClinicalKeyProvider,
} from "@/lib/security/clinical-crypto.server";
/** Shared server-only opening path; caller must authorize both before and after awaited work. */
export async function openMedicalEvolution(
  keys: ClinicalKeyProvider,
  value: unknown,
  scope: { clinicId: string; patientId: string },
  id: string,
) {
  const record = encryptedEvolutionSchema.parse(value);
  if (
    record.clinicId !== scope.clinicId ||
    record.patientId !== scope.patientId ||
    record.id !== id
  )
    throw new Error("Unexpected medical record");
  const payload = evolutionPayloadSchema.parse(
    JSON.parse(
      await decryptClinicalText(keys, record.envelope, {
        clinicId: record.clinicId,
        patientId: record.patientId,
        recordId: record.id,
        recordType: "medical_evolution",
      }),
    ),
  );
  if (
    payload.author.userId !== record.authorUserId ||
    payload.recordedAt !== record.recordedAt ||
    payload.supplementsId !== record.supplementsId
  )
    throw new Error("Unexpected medical metadata");
  return payload;
}
