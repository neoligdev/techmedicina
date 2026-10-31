import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { createMedicalEvolutionService } from "./evolution-service.server";
/** Actor must come from the verified server session, never a request body. Owner-only RPCs. */
export function createMedicalEvolutionStore(
  actorValue: unknown,
  rpc: (
    name: "tm_get_medical_evolution" | "tm_append_medical_evolution",
    args: Record<string, unknown>,
  ) => Promise<unknown>,
) {
  const actor = z.string().uuid().parse(actorValue);
  type Providers = Parameters<typeof createMedicalEvolutionService>[0];
  const store: Pick<Providers, "read" | "append"> = {
    read: (scope, id) =>
      rpc("tm_get_medical_evolution", {
        p_actor: actor,
        p_clinic: scope.clinicId,
        p_patient: scope.patientId,
        p_id: id,
      }),
    append: (record) => rpc("tm_append_medical_evolution", { p_actor: actor, p_record: record }),
  };
  return store;
}
