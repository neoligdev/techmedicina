import { Activity } from 'lucide-react';
export function Brand({ name = 'PlugPix', clinic = false, initials }: { name?: string; clinic?: boolean; initials?: string }) {
  return <div className="brand"><div className="brand-symbol">{clinic ? initials : <Activity size={25} strokeWidth={2.4} />}</div><div><strong>{name}</strong><span>{clinic ? 'Gestão da clínica' : 'TECHMEDICINA'}</span></div></div>;
}
