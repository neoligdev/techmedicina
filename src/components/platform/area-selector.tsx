import { useNavigate } from '@tanstack/react-router';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { areaLabels } from '@/features/demo/navigation';
import type { Area } from '@/features/demo/types';
export function AreaSelector({ area }: { area: Area }) {
  const navigate = useNavigate();
  return <div className="area-selector"><span className="demo-label"><span />Demonstração</span><Select value={area} onValueChange={value => {
    if (value === 'super-admin') void navigate({ to: '/super-admin' });
    if (value === 'clinica') void navigate({ to: '/clinica' });
    if (value === 'medico') void navigate({ to: '/medico' });
    if (value === 'app') void navigate({ to: '/app' });
  }}><SelectTrigger aria-label="Demonstração: selecionar área" className="area-trigger"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(areaLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>;
}
