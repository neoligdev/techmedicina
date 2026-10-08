import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clinics } from './data';
import type { Clinic } from './types';
import { defaultPreferences, validPreferences, type ClinicPreferences } from './personalization';
import { loadPreferences, storePreferences } from './preference-storage';
interface DemoContextValue { clinic: Clinic; clinics: Clinic[]; preferences: ClinicPreferences; defaults: ClinicPreferences; ready: boolean; selectClinic: (id: string) => void; savePreferences: (value: ClinicPreferences) => void; }
const DemoContext = createContext<DemoContextValue | undefined>(undefined);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [clinicId, setClinicId] = useState(clinics[0]?.id ?? '');
  const [saved, setSaved] = useState<Record<string, ClinicPreferences>>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const loaded: Record<string, ClinicPreferences> = {};
    for (const item of clinics) { const p = loadPreferences(item.id); if (p) loaded[item.id] = p; }
    setSaved(loaded);
    setReady(true);
  }, []);
  const clinic = clinics.find(item => item.id === clinicId) ?? clinics[0];
  if (!clinic) return null;
  const defaults = defaultPreferences(clinic);
  const preferences = saved[clinic.id] ?? defaults;
  const displayClinics = clinics.map(item => ({ ...item, name: saved[item.id]?.name ?? item.name }));
  return <DemoContext.Provider value={{ clinic: { ...clinic, name: preferences.name }, clinics: displayClinics, preferences, defaults, ready,
    selectClinic: id => { if (clinics.some(item => item.id === id)) setClinicId(id); },
    savePreferences: value => {
      if (!validPreferences(value)) throw new Error('Preferências inválidas.');
      const next = { ...value, name: value.name.trim() };
      storePreferences(clinic.id, next);
      setSaved(current => ({ ...current, [clinic.id]: next }));
    },
  }}>{children}</DemoContext.Provider>;
}
export function useDemoClinic() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('O contexto demonstrativo requer DemoProvider.');
  return context;
}
