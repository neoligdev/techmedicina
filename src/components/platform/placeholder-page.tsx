import { Clock3 } from 'lucide-react';
export function PlaceholderPage({ title }: { title: string }) {
  return <div className="page-content"><div className="page-heading"><div><span className="eyebrow">PLUGPIX TECHMEDICINA</span><h1>{title}</h1></div></div><div className="preparation"><div className="preparation-icon"><Clock3 size={30} strokeWidth={1.5} /></div><h2>{title}</h2><span className="preparation-status">Em preparação</span></div></div>;
}
