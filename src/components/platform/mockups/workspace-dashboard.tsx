import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Area } from "@/features/demo/types";

interface DashboardLink {
  slug: string;
  title: string;
  description: string;
}
export function WorkspaceDashboard({
  area,
  eyebrow,
  title,
  description,
  links,
  summary,
}: {
  area: Area;
  eyebrow: string;
  title: string;
  description: string;
  links: DashboardLink[];
  summary: string;
}) {
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>
            {title}
            <span className="heading-dot">.</span>
          </h1>
          <p>{description}</p>
        </div>
      </div>
      <section className="module-panel mb-6">
        <span className="module-tag">Ambiente demonstrativo</span>
        <h2>Seu espaço, organizado.</h2>
        <p>{summary}</p>
      </section>
      <div className="module-card-grid">
        {links.map((link) => (
          <Link
            key={link.slug}
            to={`/${area}/$section`}
            params={{ section: link.slug }}
            className="module-card"
          >
            <span className="module-card-icon">
              <ArrowUpRight size={22} />
            </span>
            <h2>{link.title}</h2>
            <p>{link.description}</p>
            <span className="text-sm font-medium">Explorar área →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
