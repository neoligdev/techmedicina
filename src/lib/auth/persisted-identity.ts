import { z } from "zod";
import type { AuthenticatedIdentity } from "./core";

const permission = z
  .object({
    resource: z.enum(["cadastro_clinica", "prontuario", "paciente", "agenda", "faturamento"]),
    action: z.enum(["create", "read", "write", "delete", "manage"]),
  })
  .strict();
const link = z
  .object({
    clinicId: z.string().uuid(),
    role: z.enum(["admin", "medico", "paciente"]),
    isActive: z.literal(true),
    medicalIdentityVerified: z.boolean(),
    patientId: z.string().uuid().nullable(),
    grants: z.array(permission).max(25),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.role === "paciente") !== (value.patientId !== null) ||
      (value.role !== "medico" && value.medicalIdentityVerified)
    ) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid persisted link" });
    }
  });
const persistedIdentity = z
  .object({
    userId: z.string().uuid(),
    globalRole: z.literal("super_admin").nullable(),
    links: z.array(link).max(500),
  })
  .strict();

/** Used only on the server RPC result, never on request bodies or browser metadata. */
export function parsePersistedIdentity(
  value: unknown,
  verifiedUserId: string,
): AuthenticatedIdentity | null {
  const parsed = persistedIdentity.safeParse(value);
  if (!parsed.success || parsed.data.userId !== verifiedUserId) return null;
  if (new Set(parsed.data.links.map((item) => item.clinicId)).size !== parsed.data.links.length)
    return null;
  return {
    userId: verifiedUserId,
    ...(parsed.data.globalRole ? { globalRole: parsed.data.globalRole } : {}),
    links: parsed.data.links.map(({ patientId, ...item }) => ({
      ...item,
      ...(patientId ? { patientId } : {}),
    })),
  };
}
