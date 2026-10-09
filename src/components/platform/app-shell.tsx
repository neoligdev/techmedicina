import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Menu, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoClinic } from "@/features/demo/context";
import {
  clinicIdentity,
  productIdentity,
  clinicThemeStyle,
  useClinicIdentityEffect,
} from "@/features/demo/theme";
import { navigation, areaLabels } from "@/features/demo/navigation";
import type { Area } from "@/features/demo/types";
import { Brand } from "./brand";
import { AreaSelector } from "./area-selector";
import { AreaNavigation } from "./navigation";
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const { clinic, preferences } = useDemoClinic();
  const first = pathname.split("/")[1];
  const area: Area =
    first === "clinica" || first === "medico" || first === "app" ? first : "super-admin";
  const section = pathname.split("/")[2] ?? "";
  const title = navigation[area].find((item) => item.slug === section)?.label ?? "Página";
  const branded = area !== "super-admin";
  const identity = branded ? clinicIdentity(clinic) : productIdentity;

  useClinicIdentityEffect(branded, identity.name, preferences.favicon);

  return (
    <div
      className={`platform-shell ${area === "app" ? "patient-shell" : ""} ${branded ? "clinic-branded" : ""}`}
      data-theme={identity.theme}
      data-mode={branded ? preferences.mode : undefined}
      style={branded ? clinicThemeStyle(preferences) : undefined}
    >
      {area !== "app" && (
        <>
          <div
            className={`sidebar-scrim ${menuOpen ? "is-open" : ""}`}
            onClick={() => setMenuOpen(false)}
          />
          <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
            <div className="sidebar-brand">
              <Brand
                name={branded ? identity.name : undefined}
                clinic={branded}
                initials={identity.initials}
                logo={branded ? preferences.logo : undefined}
              />
              <Button
                variant="ghost"
                size="icon"
                className="close-menu"
                aria-label="Fechar menu"
                onClick={() => setMenuOpen(false)}
              >
                <X />
              </Button>
            </div>
            <div className="workspace-label">
              <span className="workspace-dot" />
              {area === "clinica"
                ? "Administração da clínica"
                : area === "medico"
                  ? "Área profissional"
                  : "Super administrador"}
            </div>
            <span className="menu-label">PRINCIPAL</span>
            <AreaNavigation area={area} section={section} onNavigate={() => setMenuOpen(false)} />
            <div className="sidebar-bottom">
              {area !== "super-admin" && (
                <Button asChild variant="ghost" className="return-admin">
                  <Link to="/super-admin">
                    <ArrowLeft />
                    Voltar ao Super ADM
                  </Link>
                </Button>
              )}
              <div className="sidebar-environment">
                <ShieldCheck size={18} />
                <div>
                  <strong>Ambiente de demonstração</strong>
                  <span>Sem autenticação real</span>
                </div>
              </div>
              <div className="sidebar-signature">
                PlugPix Techmedicina<span>Gestão que aproxima.</span>
              </div>
            </div>
          </aside>
        </>
      )}
      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            {area !== "app" ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="open-menu"
                  aria-label="Abrir menu"
                  onClick={() => setMenuOpen(true)}
                >
                  <Menu />
                </Button>
                <span>{areaLabels[area]}</span>
                <ChevronRight size={14} />
                <strong>{title}</strong>
              </>
            ) : (
              <Brand
                name={identity.name}
                clinic
                initials={identity.initials}
                logo={preferences.logo}
              />
            )}
          </div>
          <AreaSelector area={area} />
          <div className="user-avatar" aria-label="Ambiente demonstrativo">
            {area === "super-admin"
              ? "SA"
              : area === "clinica"
                ? clinic.initials
                : area === "medico"
                  ? "MD"
                  : "PC"}
          </div>
        </header>
        <div className="demo-notice">
          <span className="notice-dot" />
          <span>
            Ambiente de demonstração{" "}
            <span className="notice-detail">
              — dados fictícios, sem acesso a informações reais.
            </span>
          </span>
          <span className="notice-badge">DEMO</span>
        </div>
        {area === "app" && <AreaNavigation area={area} section={section} />}
        <main>{children}</main>
        <footer className="main-footer">
          <span>© PlugPix Techmedicina</span>
          <span>
            Plataforma de gestão em saúde<span className="footer-dot">•</span>Demonstração
          </span>
        </footer>
      </div>
    </div>
  );
}
