import { z } from "zod";
import { withRequestDeadline } from "@/lib/http/request-deadline";
import {
  deviceRegistrationVersionQuerySchema,
  deviceRegistrationVersionSchema,
} from "./registration-version-contract";
export function createDeviceRegistrationVersionClient(
  getAccessToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
) {
  return (value: unknown) =>
    withRequestDeadline(async (signal) => {
      const input = deviceRegistrationVersionQuerySchema.parse(value);
      const token = await getAccessToken();
      if (!token || signal.aborted) throw new Error("Session required");
      const response = await fetcher(
        "/api/platform/device-registration-version?" +
          new URLSearchParams({ id: input.id, revision: String(input.revision) }),
        {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal,
        },
      );
      if (!response.ok) throw new Error("Version unavailable");
      const { version } = z
        .object({ version: deviceRegistrationVersionSchema.nullable() })
        .strict()
        .parse(await response.json());
      if (version && (version.draftId !== input.id || version.revision !== input.revision))
        throw new Error("Unexpected snapshot");
      return version;
    });
}
