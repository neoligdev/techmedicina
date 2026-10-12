import { RESERVED_HOST_NAMES } from "@/lib/white-label/host-resolver";

// Domain supplied by the owner; proposals do not represent DNS/TLS activation.
export const platformBaseDomain = "techmedicina.com.br";
export function suggestedWhiteLabelHosts(slug: string) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) || RESERVED_HOST_NAMES.has(slug))
    return null;
  return {
    central: `admin.${platformBaseDomain}`,
    clinic_portal: `${slug}.${platformBaseDomain}`,
    patient_pwa: `app.${slug}.${platformBaseDomain}`,
  };
}
