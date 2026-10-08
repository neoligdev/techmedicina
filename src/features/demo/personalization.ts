import type { Clinic } from './types';

export interface ClinicPreferences {
  name: string;
  primary: string;
  secondary: string;
  mode: 'light' | 'dark';
}
export const validColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
export function validPreferences(value: unknown): value is ClinicPreferences {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<ClinicPreferences>;
  return typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 80
    && typeof p.primary === 'string' && validColor(p.primary)
    && typeof p.secondary === 'string' && validColor(p.secondary)
    && (p.mode === 'light' || p.mode === 'dark');
}
export function defaultPreferences(clinic: Clinic): ClinicPreferences {
  return { name: clinic.name, primary: clinic.theme === 'verde' ? '#23765a' : '#326fbb', secondary: '#168567', mode: 'light' };
}