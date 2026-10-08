import { validPreferences, type ClinicPreferences } from './personalization';

const key = (id: string) => `plugpix:clinic-visual:v1:${id}`;
// Visual preferences only. Replace this adapter for future server persistence.
export function loadPreferences(id: string): ClinicPreferences | undefined {
  try {
    const raw = localStorage.getItem(key(id));
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    return validPreferences(value) ? { name: value.name.trim(), primary: value.primary, secondary: value.secondary, mode: value.mode } : undefined;
  } catch { return undefined; }
}
export function storePreferences(id: string, preferences: ClinicPreferences) {
  if (!validPreferences(preferences)) throw new Error('Preferências inválidas.');
  localStorage.setItem(key(id), JSON.stringify({ name: preferences.name.trim(), primary: preferences.primary, secondary: preferences.secondary, mode: preferences.mode }));
}