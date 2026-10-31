import { z } from "zod";
import { evolutionScopeSchema, evolutionPayloadSchema } from "./evolution-contract";
/** Browser-safe result only: no key provider, ciphertext opening or server imports. */
export const medicalEvolutionResultSchema = evolutionScopeSchema
  .extend({ id: z.string().uuid(), ...evolutionPayloadSchema.shape })
  .strict();
export const medicalViewerSchema = evolutionScopeSchema
  .extend({ userId: z.string().uuid() })
  .strict();
