import type { Clinic } from "./types";

export interface ClinicPreferences {
  name: string;
  primary: string;
  secondary: string;
  mode: "light" | "dark";
  logo?: string | undefined;
  favicon?: string | undefined;
}
export const validColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

export const validImageBase64 = (value: unknown): boolean => {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  // Limit arbitrary length check. Conservative 200KB base64 is ~275000 chars.
  if (value.length > 275000) return false;
  const match = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return false;

  const mime = match[1];
  const payload = match[2];
  if (!payload) return false;

  try {
    const raw = atob(payload);
    if (btoa(raw) !== payload) return false; // Not canonical
    if (raw.length > 204800) return false;

    const toHex = (str: string, len: number) => {
      let hex = "";
      for (let i = 0; i < len && i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16).padStart(2, "0");
      }
      return hex;
    };

    if (mime === "png") {
      return toHex(raw, 8) === "89504e470d0a1a0a";
    }
    if (mime === "jpeg") {
      return toHex(raw, 3).toLowerCase() === "ffd8ff";
    }
    if (mime === "webp") {
      return (
        toHex(raw, 4).toLowerCase() === "52494646" &&
        toHex(raw.substring(8), 4).toLowerCase() === "57454250"
      );
    }
    return false;
  } catch {
    return false;
  }
};
export function validPreferences(value: unknown): value is ClinicPreferences {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<ClinicPreferences>;
  return (
    typeof p.name === "string" &&
    p.name.trim().length > 0 &&
    p.name.length <= 80 &&
    typeof p.primary === "string" &&
    validColor(p.primary) &&
    typeof p.secondary === "string" &&
    validColor(p.secondary) &&
    (p.mode === "light" || p.mode === "dark") &&
    validImageBase64(p.logo) &&
    validImageBase64(p.favicon)
  );
}
export function defaultPreferences(clinic: Clinic): ClinicPreferences {
  return {
    name: clinic.name,
    primary: clinic.theme === "verde" ? "#23765a" : "#326fbb",
    secondary: "#168567",
    mode: "light",
  };
}
