import { z } from "zod";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import {
  deviceRegistrationWriteSchema,
  savedDeviceRegistrationSchema,
} from "./registration-contract";
export class DeviceRegistrationConflict extends Error {}
export function createDeviceRegistrationClient(
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  async function request(id: string, value?: unknown) {
    const checkedId = z.string().uuid().parse(id);
    const input = value === undefined ? undefined : deviceRegistrationWriteSchema.parse(value);
    if (input && input.id !== checkedId) throw new Error("Unexpected draft");
    return withRequestDeadline(async (signal) => {
      const token = await getAccessToken();
      if (!token || signal.aborted) throw new Error("Session required");
      const response = await fetcher(
        "/api/platform/device-registration-draft?" + new URLSearchParams({ id: checkedId }),
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
      if (response.status === 409) throw new DeviceRegistrationConflict("Revision changed");
      if (!response.ok) throw new Error("Draft unavailable");
      const { draft } = z
        .object({ draft: savedDeviceRegistrationSchema.nullable() })
        .strict()
        .parse(await response.json());
      if (draft && draft.id !== checkedId) throw new Error("Unexpected draft");
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
    read: (id: string) => request(id),
    save: (value: unknown) => {
      const input = deviceRegistrationWriteSchema.parse(value);
      return request(input.id, input);
    },
  };
}
