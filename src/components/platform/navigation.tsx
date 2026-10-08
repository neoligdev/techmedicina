import { Link } from '@tanstack/react-router';
import { Building2, Stethoscope, Users, Layers, Watch, Wallet, LayoutDashboard, ClipboardList, ShoppingBag, Plug, CalendarDays, FileHeart, Sun, HeartPulse, Gift } from 'lucide-react';
import { navigation } from '@/features/demo/navigation';
import type { Area } from '@/features/demo/types';
const icons = { building: Building2, doctors: Stethoscope, users: Users, plans: Layers, devices: Watch, finance: Wallet, overview: LayoutDashboard, protocols: ClipboardList, sales: ShoppingBag, integrations: Plug, calendar: CalendarDays, consultations: FileHeart, day: Sun, health: HeartPulse, benefits: Gift };
export function AreaNavigation({ area, section, onNavigate }: { area: Area; section: string; onNavigate?: () => void }) {
  return <nav className={area === 'app' ? 'patient-navigation' : 'side-navigation'} aria-label="Menu principal">{navigation[area].map(item => {
    const Icon = icons[item.icon];
    const className = `nav-item ${section === item.slug ? 'is-active' : ''}`;
    const content = <><Icon size={19} strokeWidth={1.7} /><span>{item.label}</span></>;
    if (!item.slug) return <Link key="index" to={`/${area}`} className={className} onClick={onNavigate}>{content}</Link>;
    return <Link key={item.slug} to={`/${area}/$section`} params={{ section: item.slug }} className={className} onClick={onNavigate}>{content}</Link>;
  })}</nav>;
}
