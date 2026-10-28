import { z } from "zod";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import {
  clinicContractWriteSchema,
  savedClinicContractSchema,
  clinicContractScopeSchema,
} from "./contracts";
export class ClinicContractConflict extends Error {}
export function createClinicContractClient(
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  async function request(scope: unknown, value?: unknown) {
    const { id: checkedId, clinicId } = clinicContractScopeSchema.parse(scope);
    const input = value === undefined ? undefined : clinicContractWriteSchema.parse(value);
    if (input && (input.id !== checkedId || input.clinicId !== clinicId))
      throw new Error("Unexpected draft");
    return withRequestDeadline(async (signal) => {
      const token = await getAccessToken();
      if (!token || signal.aborted) throw new Error("Session required");
      const response = await fetcher(
        "/api/platform/clinic-contract-draft?" + new URLSearchParams({ id: checkedId, clinicId }),
        {
          method: input ? "PUT" : "GET",
          headers: {
            Authorization: "Bearer " + token,
            ...(input ? { "Content-Type": "application/json" } : {}),
          },
          ...(input ? { body: JSON.stringify(input) } : {}),
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal,
        },
      );
      if (response.status === 409) throw new ClinicContractConflict("Revision changed");
      if (!response.ok) throw new Error("Draft unavailable");
      const { draft } = z
        .object({ draft: savedClinicContractSchema.nullable() })
        .strict()
        .parse(await response.json());
      if (draft && (draft.id !== checkedId || draft.clinicId !== clinicId))
        throw new Error("Unexpected draft");
      if (
        input &&
        (!draft ||
          ![input.expectedRevision, input.expectedRevision + 1].includes(draft.revision) ||
          JSON.stringify(draft.document) !== JSON.stringify(input.document))
      )
        throw new Error("Unconfirmed write");
      return draft;
    });
  }
  return {
    read: (scope: unknown) => request(scope),
    save: (value: unknown) => {
      const input = clinicContractWriteSchema.parse(value);
      return request({ id: input.id, clinicId: input.clinicId }, input);
    },
  };
}
