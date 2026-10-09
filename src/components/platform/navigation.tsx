import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Stethoscope,
  Users,
  Layers,
  Watch,
  Wallet,
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  Plug,
  CalendarDays,
  FileHeart,
  Sun,
  HeartPulse,
  Gift,
  Palette,
  Sparkles,
  Shield,
  Activity,
  BookOpen,
  GraduationCap,
  Share2,
} from "lucide-react";
import { navigation } from "@/features/demo/navigation";
import { Button } from "@/components/ui/button";
import type { Area } from "@/features/demo/types";
const icons = {
  palette: Palette,
  building: Building2,
  doctors: Stethoscope,
  users: Users,
  plans: Layers,
  devices: Watch,
  finance: Wallet,
  overview: LayoutDashboard,
  protocols: ClipboardList,
  sales: ShoppingBag,
  integrations: Plug,
  calendar: CalendarDays,
  consultations: FileHeart,
  day: Sun,
  health: HeartPulse,
  benefits: Gift,
  sparkles: Sparkles,
  shield: Shield,
  activity: Activity,
  book: BookOpen,
  graduation: GraduationCap,
  share: Share2,
} as const;
export function AreaNavigation({
  area,
  section,
  onNavigate,
}: {
  area: Area;
  section: string;
  onNavigate?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = navigation[area];
  const grouped = items.reduce(
    (groups, item) => {
      const group = item.group || "Principal";
      (groups[group] ??= []).push(item);
      return groups;
    },
    {} as Record<string, typeof items>,
  );
  function itemLink(item: (typeof items)[number]) {
    const Icon = icons[item.icon as keyof typeof icons] || LayoutDashboard;
    const content = (
      <>
        <Icon size={19} strokeWidth={1.7} />
        <span>{item.label}</span>
      </>
    );
    const props = {
      className: `nav-item ${section === item.slug ? "is-active" : ""}`,
      "aria-current": section === item.slug ? ("page" as const) : undefined,
      onClick: () => {
        setExpanded(false);
        onNavigate?.();
      },
    };
    return item.slug ? (
      <Link key={item.slug} to={`/${area}/$section`} params={{ section: item.slug }} {...props}>
        {content}
      </Link>
    ) : (
      <Link key="index" to={`/${area}`} {...props}>
        {content}
      </Link>
    );
  }
  if (area === "app") {
    const primary = ["", "saude", "protocolos", "beneficios"];
    return (
      <div className="patient-navigation-container">
        <nav className="patient-navigation" aria-label="Menu principal">
          {items.filter((item) => primary.includes(item.slug)).map(itemLink)}
          <Button
            variant="ghost"
            className={`nav-item ${expanded || !primary.includes(section) ? "is-active" : ""}`}
            aria-expanded={expanded}
            aria-controls="patient-all-resources"
            onClick={() => setExpanded(!expanded)}
          >
            <LayoutDashboard size={19} />
            <span>Mais</span>
          </Button>
        </nav>
        {expanded && (
          <nav
            className="patient-all-resources"
            id="patient-all-resources"
            aria-label="Todos os recursos"
          >
            {Object.entries(grouped)
              .filter(([group]) => group !== "Principal")
              .map(([group, links]) => (
                <section key={group}>
                  <h2>{group}</h2>
                  {links.map(itemLink)}
                </section>
              ))}
          </nav>
        )}
      </div>
    );
  }
  return (
    <nav className="side-navigation" aria-label="Menu principal">
      {Object.entries(grouped).map(([group, links]) => (
        <section key={group} className="navigation-group">
          <h2>{group}</h2>
          {links.map(itemLink)}
        </section>
      ))}
    </nav>
  );
}
