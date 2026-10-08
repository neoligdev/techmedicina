import type { Clinic } from './types';
export const productIdentity = { name: 'PlugPix Techmedicina', initials: 'P', theme: 'platform' };
export function clinicIdentity(clinic: Clinic) { return { name: clinic.name, initials: clinic.initials, theme: clinic.theme }; }
