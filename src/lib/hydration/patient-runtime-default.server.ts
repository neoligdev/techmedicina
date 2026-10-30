import "@tanstack/react-start/server-only";
import { resolveBrandingContext, query } from "@/lib/admin/clinic-branding-runtime.server";
import { createPatientHydrationRuntime } from "./patient-runtime.server";
export const handlePatientHydrationRequest = createPatientHydrationRuntime({
  resolveSession: async () => resolveBrandingContext(),
  rpc: (session, name, args) =>
    query(session, "rest/v1/rpc/" + name, { method: "POST", body: JSON.stringify(args) }),
});
