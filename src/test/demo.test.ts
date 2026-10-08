import { describe, it, expect } from 'vitest';
import { clinics, filterClinics } from '@/features/demo/data';
import { navigation } from '@/features/demo/navigation';
describe('Dados administrativos demonstrativos', () => {
  it('contém somente duas clínicas com identificadores únicos', () => {
    expect(clinics).toHaveLength(2);
    expect(new Set(clinics.map(clinic => clinic.id)).size).toBe(2);
  });
  it('busca por nome sem diferenciar acentos e caixa', () => {
    expect(filterClinics('  viva saude  ')).toHaveLength(1);
    expect(filterClinics('HORIZONTE')[0]?.id).toBe('clinica-horizonte');
    expect(filterClinics('inexistente')).toHaveLength(0);
    expect(filterClinics('')).toHaveLength(2);
  });
  it('oferece os menus previstos para as quatro áreas', () => {
    expect(Object.values(navigation).map(items => items.length)).toEqual([6, 8, 3, 5]);
  });
});
