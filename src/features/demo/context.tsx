import { createContext, useContext, useState, type ReactNode } from 'react';
import { clinics } from './data';
import type { Clinic } from './types';
interface DemoContextValue { clinic: Clinic; selectClinic: (id: string) => void; }
const DemoContext = createContext<DemoContextValue | undefined>(undefined);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [clinicId, setClinicId] = useState(clinics[0]?.id ?? '');
  const clinic = clinics.find(item => item.id === clinicId) ?? clinics[0];
  if (!clinic) return null;
  return <DemoContext.Provider value={{ clinic, selectClinic: id => { if (clinics.some(item => item.id === id)) setClinicId(id); } }}>{children}</DemoContext.Provider>;
}
export function useDemoClinic() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('O contexto demonstrativo requer DemoProvider.');
  return context;
}
