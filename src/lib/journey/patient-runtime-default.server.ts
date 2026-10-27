import "@tanstack/react-start/server-only";
import {
  resolveBrandingContext as resolveRequestContext,
  query as requestDatabaseQuery,
} from "../admin/clinic-branding-runtime.server";
import { createPatientJourneyRuntime } from "./patient-runtime.server";
/** Reuse Auth-verified request bearer/publishable transport. Missing SQL/host never enables demo. */
export const handlePatientJourneyRequest = createPatientJourneyRuntime({
  resolveSession: async () => resolveRequestContext(),
  rpc: async (session, name, args) =>
    requestDatabaseQuery(session, `rest/v1/rpc/${name}`, {
      method: "POST",
      body: JSON.stringify(args),
    }),
});
