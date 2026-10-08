import type { Area, NavigationItem } from './types';
export const areaLabels: Record<Area, string> = { 'super-admin': 'Super ADM', clinica: 'Clínica', medico: 'Médico', app: 'Paciente' };
export const navigation: Record<Area, NavigationItem[]> = {
  'super-admin': [
    { slug: '', label: 'Clínicas', icon: 'building' }, { slug: 'medicos', label: 'Médicos', icon: 'doctors' },
    { slug: 'clientes', label: 'Clientes', icon: 'users' }, { slug: 'planos', label: 'Planos', icon: 'plans' },
    { slug: 'dispositivos', label: 'Dispositivos', icon: 'devices' }, { slug: 'financeiro', label: 'Financeiro', icon: 'finance' },
  ],
  clinica: [
    { slug: '', label: 'Visão geral', icon: 'overview' }, { slug: 'pacientes', label: 'Pacientes', icon: 'users' },
    { slug: 'equipe', label: 'Equipe', icon: 'doctors' }, { slug: 'planos-produtos', label: 'Planos & Produtos', icon: 'plans' },
    { slug: 'protocolos', label: 'Protocolos', icon: 'protocols' }, { slug: 'dispositivos', label: 'Dispositivos', icon: 'devices' },
    { slug: 'vendas', label: 'Vendas', icon: 'sales' }, { slug: 'integracoes', label: 'Integrações', icon: 'integrations' },
     { slug: 'personalizacao', label: 'Personalização', icon: 'palette' },
  ],
  medico: [{ slug: '', label: 'Agenda', icon: 'calendar' }, { slug: 'pacientes', label: 'Pacientes', icon: 'users' }, { slug: 'consultas', label: 'Consultas', icon: 'consultations' }],
  app: [{ slug: '', label: 'Meu dia', icon: 'day' }, { slug: 'saude', label: 'Saúde', icon: 'health' }, { slug: 'protocolos', label: 'Protocolos', icon: 'protocols' }, { slug: 'beneficios', label: 'Benefícios', icon: 'benefits' }, { slug: 'financeiro', label: 'Financeiro', icon: 'finance' }],
};
