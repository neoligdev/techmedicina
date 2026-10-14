import { z } from "zod";
import { patientShieldOverviewSchema } from "./contracts";
import { withJourneyDeadline } from "./request-deadline";

/** Scope validates responses; actual authorization belongs to host/Auth/RLS. */
export function createOwnShieldClient(
  scope: {
    clinicId: string;
    patientId: string;
    getAccessToken: () => Promise<string | null>;
  },
  fetcher: typeof fetch = fetch,
) {
  return async () =>
    withJourneyDeadline(async (signal) => {
      const token = await scope.getAccessToken();
      if (signal.aborted) throw new Error("Shield request expired");
      if (!token) throw new Error("Session required");
      const response = await fetcher("/api/journey/shields", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (!response.ok) throw new Error("Shields unavailable");
      const { overview } = z
        .object({ overview: patientShieldOverviewSchema })
        .strict()
        .parse(await response.json());
      if (
        overview.clinicId !== scope.clinicId ||
        overview.patientId !== scope.patientId ||
        overview.state.clinicId !== scope.clinicId ||
        overview.state.patientId !== scope.patientId ||
        overview.history.some(
          (event) => event.clinicId !== scope.clinicId || event.patientId !== scope.patientId,
        )
      )
        throw new Error("Unexpected shield scope");
      return overview;
    });
}
