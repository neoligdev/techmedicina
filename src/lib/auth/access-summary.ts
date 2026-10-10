import { z } from "zod";
import type { AuthenticatedIdentity } from "./core";

export const accessSummarySchema = z
  .object({
    platformAdmin: z.boolean(),
    clinicCount: z.number().int().min(0).max(500),
  })
  .strict();
export type AccessSummary = z.infer<typeof accessSummarySchema>;

export function summarizeAccess(identity: AuthenticatedIdentity): AccessSummary {
  return {
    platformAdmin: identity.globalRole === "super_admin",
    clinicCount: new Set(
      identity.links.filter((link) => link.isActive).map((link) => link.clinicId),
    ).size,
  };
}
