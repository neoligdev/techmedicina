import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Menu, X, ShieldCheck, Sun, Moon } from "lucide-react";
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
  const [mobile, setMobile] = useState(false);
  const [adminMode, setAdminMode] = useState<"dark" | "light">("dark");
  const sidebar = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => {
      setMobile(media.matches);
      setMenuOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile || !menuOpen) return;
    const panel = sidebar.current;
    if (!panel) return;
    const focusable = () =>
      Array.from(panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const previous = document.body.style.overflow;
    const trigger = menuTrigger.current;
    document.body.style.overflow = "hidden";
    panel.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previous;
      panel.removeEventListener("keydown", keydown);
      trigger?.focus();
    };
  }, [mobile, menuOpen]);
  const { clinic, preferences } = useDemoClinic();
  const first = pathname.split("/")[1];
  const area: Area =
    first === "clinica" || first === "medico" || first === "app" ? first : "super-admin";
  const section = pathname.split("/")[2] ?? "";
  const title =
    first === "staus"
      ? "Status do projeto"
      : (navigation[area].find((item) => item.slug === section)?.label ?? "Página");
  const branded = area !== "super-admin";
  const identity = branded ? clinicIdentity(clinic) : productIdentity;

  useEffect(() => {
    if (area !== "app" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/app-sw.js", { scope: "/app" }).catch(() => {
      // Installation support is optional; the online application remains usable.
    });
  }, [area]);

  useClinicIdentityEffect(branded, identity.name, preferences.favicon);

  return (
    <div
      className={`platform-shell ${area === "app" ? "patient-shell" : ""} ${branded ? "clinic-branded" : ""}`}
      data-theme={identity.theme}
      data-mode={branded ? preferences.mode : adminMode}
      style={branded ? clinicThemeStyle(preferences) : undefined}
    >
      {area !== "app" && (
        <>
          <div
            className={`sidebar-scrim ${menuOpen ? "is-open" : ""}`}
            onClick={() => setMenuOpen(false)}
          />
          <aside
            ref={sidebar}
            className={`sidebar ${menuOpen ? "is-open" : ""}`}
            inert={mobile && !menuOpen}
            role={mobile && menuOpen ? "dialog" : undefined}
            aria-modal={mobile && menuOpen ? true : undefined}
            aria-label="Navegação da área"
            id="area-sidebar"
          >
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
      <div className="main-area" inert={mobile && menuOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            {area !== "app" ? (
              <>
                <Button
                  ref={menuTrigger}
                  variant="ghost"
                  size="icon"
                  className="open-menu"
                  aria-label="Abrir menu"
                  aria-expanded={menuOpen}
                  aria-controls="area-sidebar"
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
          {!branded && (
            <Button asChild variant="outline" size="sm" className="project-status-top-link">
              <Link to="/staus">
                Status do projeto<span className="project-status-temporary"> · temporário</span>
              </Link>
            </Button>
          )}
          {!branded && (
            <Button
              variant="ghost"
              size="icon"
              className="mode-toggle"
              aria-label={adminMode === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
              title={adminMode === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
              onClick={() => setAdminMode(adminMode === "dark" ? "light" : "dark")}
            >
              {adminMode === "dark" ? <Sun /> : <Moon />}
            </Button>
          )}
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
