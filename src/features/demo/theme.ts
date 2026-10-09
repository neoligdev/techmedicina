import type { Clinic } from "./types";
import type { CSSProperties } from "react";
import { validColor, type ClinicPreferences } from "./personalization";
export const productIdentity = { name: "PlugPix Techmedicina", initials: "P", theme: "platform" };
export function clinicIdentity(clinic: Clinic) {
  return { name: clinic.name, initials: clinic.initials, theme: clinic.theme };
}

function luminance(rgb: number[]) {
  return rgb.reduce((sum, channel, i) => {
    const c = channel / 255;
    return (
      sum +
      (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) * ([0.2126, 0.7152, 0.0722][i] ?? 0)
    );
  }, 0);
}
function channels(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function readableBrand(hex: string, dark: boolean) {
  let rgb = channels(hex);
  const surface = dark ? luminance(channels("#142B43")) : 1;
  for (let i = 0; i < 60; i++) {
    const l = luminance(rgb);
    if ((Math.max(l, surface) + 0.05) / (Math.min(l, surface) + 0.05) >= 4.6) break;
    rgb = rgb.map((c) => Math.round(dark ? c + (255 - c) * 0.1 : c * 0.9));
  }
  return `rgb(${rgb.join(" ")})`;
}
export function brandColorAdjusted(p: ClinicPreferences) {
  if (!validColor(p.primary)) return false;
  return readableBrand(p.primary, p.mode === "dark") !== `rgb(${channels(p.primary).join(" ")})`;
}
export function clinicThemeStyle(p: ClinicPreferences): CSSProperties {
  if (!validColor(p.primary) || !validColor(p.secondary)) return {};
  const primary = readableBrand(p.primary, p.mode === "dark");
  const rgb = primary.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  return {
    "--brand-primary": p.primary,
    "--brand-secondary": p.secondary,
    "--primary": primary,
    "--primary-foreground":
      luminance(rgb) > 0.179 ? "var(--contrast-dark)" : "var(--contrast-light)",
    "--brand-secondary-foreground":
      luminance(channels(p.secondary)) > 0.179 ? "var(--contrast-dark)" : "var(--contrast-light)",
  } as CSSProperties;
}
