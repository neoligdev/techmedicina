import { z } from "zod";
import { journeyPreferenceInputSchema } from "./contracts";
import { journeyParticipationSchema, JourneyParticipationConflict } from "./participation";
import { withJourneyDeadline } from "./request-deadline";

const responseSchema = z.object({ preference: journeyParticipationSchema }).strict();
/** Same-origin only. The server must resolve Auth and host, never trust this browser scope. */
export function createJourneyParticipationClient(
  scope: { clinicId: string; patientId: string; getAccessToken: () => Promise<string | null> },
  fetcher: typeof fetch = fetch,
) {
  async function request(input?: unknown) {
    const parsed = input === undefined ? undefined : journeyPreferenceInputSchema.parse(input);
    if (parsed && parsed.patientId !== scope.patientId) throw new Error("Unexpected patient");
    return withJourneyDeadline(async (signal) => {
      const token = await scope.getAccessToken();
      if (signal.aborted) throw new Error("Journey request expired");
      if (!token) throw new Error("Session required");
      const response = await fetcher("/api/journey/participation", {
        method: parsed ? "PUT" : "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(parsed ? { "Content-Type": "application/json" } : {}),
        },
        ...(parsed ? { body: JSON.stringify(parsed) } : {}),
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      });
      if (response.status === 409) throw new JourneyParticipationConflict();
      if (!response.ok) throw new Error("Participation unavailable");
      const { preference } = responseSchema.parse(await response.json());
      if (preference.clinicId !== scope.clinicId || preference.patientId !== scope.patientId)
        throw new Error("Unexpected patient");
      return preference;
    });
  }
  return { read: () => request(), save: (input: unknown) => request(input) };
}
