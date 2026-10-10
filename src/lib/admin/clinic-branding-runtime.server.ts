import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { resolveSupabaseContext } from "../auth/supabase-adapter.server";
import { AuthError } from "../auth/guards.server";
import { createClinicBrandingHandlers } from "./clinic-branding.server";

async function resolveBrandingContext() {
  const context = await resolveSupabaseContext();
  if (!context) return null;
  const authorization = getRequest().headers.get("authorization");
  const base = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!authorization || !base || !key) return null;
  return { identity: context.identity, authorization, base, key };
}

// The request identity is validated by getUser and tm_resolve_identity first.
// PostgREST uses that same bearer and publishable key, retaining RLS and RPC checks.
// JSON is parsed by strict DTOs, without editing generated managed database types.
async function query(
  context: NonNullable<Awaited<ReturnType<typeof resolveBrandingContext>>>,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(new URL(path, `${context.base.replace(/\/$/, "")}/`), {
    ...init,
    cache: "no-store",
    redirect: "error",
    headers: {
      apikey: context.key,
      Authorization: context.authorization,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const raw: unknown = await response.json().catch(() => null);
    const code = raw && typeof raw === "object" && "code" in raw ? raw.code : null;
    if (code === "40001") throw new AuthError("Conflict", 409);
    if (code === "42501" || response.status === 403) throw new AuthError("Denied", 403);
    if (response.status === 401) throw new AuthError("Session expired", 401);
    if (code === "22023") throw new AuthError("Invalid input", 400);
    throw new Error("Branding unavailable");
  }
  return response.json();
}

export const clinicBrandingHandlers = createClinicBrandingHandlers(
  resolveBrandingContext,
  async (context, clinicId) => {
    const params = new URLSearchParams({
      clinic_id: `eq.${clinicId}`,
      select: "clinic_id,preferences,revision,updated_at",
      limit: "2",
    });
    const rows = await query(context, `rest/v1/tm_clinic_branding?${params}`);
    if (!Array.isArray(rows) || rows.length > 1) throw new Error("Unexpected branding rows");
    return rows[0] ?? null;
  },
  (context, input) =>
    query(context, "rest/v1/rpc/tm_save_branding", {
      method: "POST",
      body: JSON.stringify({
        p_clinic_id: input.clinicId,
        p_preferences: input.preferences,
        p_expected_revision: input.expectedRevision,
      }),
    }),
);
