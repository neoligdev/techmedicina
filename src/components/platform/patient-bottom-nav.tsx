import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Stethoscope,
  Droplets,
  Sparkles,
  UtensilsCrossed,
  User,
  X,
  PhoneCall,
  CalendarDays,
  Apple,
  Brain,
  Layers,
  ChevronRight,
  Shield,
  HelpCircle,
  LogOut,
  Users,
  Sun,
  Moon,
  Send,
  MessageSquare,
} from "lucide-react";
import { useDemoClinic } from "@/features/demo/context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export function PatientBottomNav() {
  const pathname = useRouterState({ select: (s) => s?.location?.pathname ?? "/app" });
  const navigate = useNavigate();

  const { clinic, preferences, savePreferences } = useDemoClinic();

  const [telemedicinaOpen, setTelemedicinaOpen] = useState(false);
  const [iaOpen, setIaOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [iaInput, setIaInput] = useState("");
  const [iaMessages, setIaMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>(
    [
      {
        role: "assistant",
        text: `Olá! Sou a Dra. Sofia, assistente virtual da ${clinic.name}. Como posso ajudar na sua rotina de saúde hoje?`,
      },
    ],
  );

  const isHome = pathname === "/app" || pathname === "/app/";
  const isAgua = pathname === "/app/hidratacao";
  const isAlimentacao = pathname === "/app/alimentacao";

  function handleSendIa() {
    if (!iaInput.trim()) return;
    const userText = iaInput.trim();
    setIaMessages((prev) => [...prev, { role: "user", text: userText }]);
    setIaInput("");
    setTimeout(() => {
      let reply =
        "Entendido! Estou registrando essa informação na sua rotina e acompanharei na sua próxima revisão.";
      if (userText.toLowerCase().includes("água") || userText.toLowerCase().includes("agua")) {
        reply =
          "Lembre-se de registrar cada copo d'água no card de hidratação para manter sua meta diária em dia!";
      } else if (
        userText.toLowerCase().includes("remédio") ||
        userText.toLowerCase().includes("medicamento")
      ) {
        reply =
          "Seus medicamentos prescritos podem ser consultados no atalho Medicamentos da tela inicial.";
      } else if (
        userText.toLowerCase().includes("consulta") ||
        userText.toLowerCase().includes("médico")
      ) {
        reply =
          "Você pode agendar ou iniciar um atendimento de telemedicina a qualquer momento pelo menu Telemedicina.";
      }
      setIaMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    }, 600);
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut({ scope: "local" });
      setPerfilOpen(false);
      await navigate({ to: "/login", replace: true });
    } catch {
      setPerfilOpen(false);
      await navigate({ to: "/login", replace: true });
    }
  }

  function toggleTheme() {
    savePreferences({
      ...preferences,
      mode: preferences.mode === "dark" ? "light" : "dark",
    });
  }

  return (
    <>
      <nav className="patient-bottom-bar" aria-label="Navegação principal do paciente">
        <div className="patient-bottom-grid">
          {/* 1. INÍCIO */}
          <Link
            to="/app"
            className={`patient-nav-btn ${isHome ? "is-active" : ""}`}
            aria-current={isHome ? "page" : undefined}
          >
            <Home size={22} className="nav-icon" />
            <span className="nav-label">INÍCIO</span>
          </Link>

          {/* 2. TELEMEDICINA */}
          <button
            type="button"
            className={`patient-nav-btn ${telemedicinaOpen ? "is-active" : ""}`}
            onClick={() => setTelemedicinaOpen(true)}
            aria-label="Acessar telemedicina"
          >
            <Stethoscope size={22} className="nav-icon" />
            <span className="nav-label">TELEMEDICINA</span>
          </button>

          {/* 3. ÁGUA */}
          <Link
            to="/app/$section"
            params={{ section: "hidratacao" }}
            className={`patient-nav-btn ${isAgua ? "is-active" : ""}`}
            aria-current={isAgua ? "page" : undefined}
          >
            <Droplets size={22} className="nav-icon" />
            <span className="nav-label">ÁGUA</span>
          </Link>

          {/* 4. IA */}
          <button
            type="button"
            className={`patient-nav-btn ${iaOpen ? "is-active" : ""}`}
            onClick={() => setIaOpen(true)}
            aria-label="Assistente Dr. IA"
          >
            <Sparkles size={22} className="nav-icon" />
            <span className="nav-label">IA</span>
          </button>

          {/* 5. ALIMENTAÇÃO */}
          <Link
            to="/app/$section"
            params={{ section: "alimentacao" }}
            className={`patient-nav-btn ${isAlimentacao ? "is-active" : ""}`}
          >
            <UtensilsCrossed size={22} className="nav-icon" />
            <span className="nav-label">ALIMENTAÇÃO</span>
          </Link>

          {/* 6. PERFIL */}
          <button
            type="button"
            className={`patient-nav-btn ${perfilOpen ? "is-active" : ""}`}
            onClick={() => setPerfilOpen(true)}
            aria-label="Meu perfil"
          >
            <User size={22} className="nav-icon" />
            <span className="nav-label">PERFIL</span>
          </button>
        </div>
      </nav>

      {/* MODAL TELEMEDICINA */}
      <Dialog open={telemedicinaOpen} onOpenChange={setTelemedicinaOpen}>
        <DialogContent className="patient-modal telemedicina-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Stethoscope className="text-primary" size={24} />
              Telemedicina · {clinic.name}
            </DialogTitle>
            <DialogDescription>
              Acesso rápido a atendimento médico, agendamentos e especialidades de saúde.
            </DialogDescription>
          </DialogHeader>

          <div className="telemedicina-action-list">
            <button
              type="button"
              className="telemedicina-item urgent-item"
              onClick={() => {
                alert(
                  "Conectando ao pronto atendimento 24h... Tempo estimado de espera: 3 minutos.",
                );
                setTelemedicinaOpen(false);
              }}
            >
              <div className="item-icon-wrap urgent">
                <PhoneCall size={22} />
              </div>
              <div className="item-text">
                <strong>Fale com um médico agora</strong>
                <span>Pronto atendimento 24h sem fila</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>

            <Link
              to="/app/$section"
              params={{ section: "consulta" }}
              className="telemedicina-item"
              onClick={() => setTelemedicinaOpen(false)}
            >
              <div className="item-icon-wrap">
                <CalendarDays size={22} />
              </div>
              <div className="item-text">
                <strong>Agende uma consulta</strong>
                <span>Escolha data, horário e profissional</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </Link>

            <button
              type="button"
              className="telemedicina-item"
              onClick={() => {
                alert("Módulo de Nutrição: nutricionistas disponíveis para consultas online.");
                setTelemedicinaOpen(false);
              }}
            >
              <div className="item-icon-wrap">
                <Apple size={22} />
              </div>
              <div className="item-text">
                <strong>Nutrição</strong>
                <span>Plano alimentar e acompanhamento nutricional</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>

            <button
              type="button"
              className="telemedicina-item"
              onClick={() => {
                alert("Módulo de Psicologia: psicólogos credenciados para acolhimento.");
                setTelemedicinaOpen(false);
              }}
            >
              <div className="item-icon-wrap">
                <Brain size={22} />
              </div>
              <div className="item-text">
                <strong>Psicologia</strong>
                <span>Saúde mental e terapia integrativa</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>

            <button
              type="button"
              className="telemedicina-item"
              onClick={() => {
                alert("Especialidades médicas: Cardiologia, Endocrinologia, Dermatologia e mais.");
                setTelemedicinaOpen(false);
              }}
            >
              <div className="item-icon-wrap">
                <Layers size={22} />
              </div>
              <div className="item-text">
                <strong>Especialidades</strong>
                <span>Cardiologia, Dermatologia, Endocrinologia</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>

            <Link
              to="/app/$section"
              params={{ section: "consulta" }}
              className="telemedicina-item"
              onClick={() => setTelemedicinaOpen(false)}
            >
              <div className="item-icon-wrap">
                <MessageSquare size={22} />
              </div>
              <div className="item-text">
                <strong>Minhas consultas</strong>
                <span>Histórico de consultas e prescrições</span>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL IA */}
      <Dialog open={iaOpen} onOpenChange={setIaOpen}>
        <DialogContent className="patient-modal ia-modal">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="ia-avatar-wrap">
                <Sparkles size={20} className="text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Dra. Sofia · Assistente Virtual
                </DialogTitle>
                <DialogDescription>{clinic.name} · Inteligência Clínica e Rotina</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="ia-chat-container">
            <div className="ia-chat-messages" role="log" aria-live="polite">
              {iaMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`ia-message-bubble ${m.role === "assistant" ? "is-assistant" : "is-user"}`}
                >
                  <p>{m.text}</p>
                </div>
              ))}
            </div>

            <div className="ia-chat-input-bar">
              <input
                type="text"
                placeholder="Pergunte sobre sua rotina, hidratação ou exames..."
                value={iaInput}
                onChange={(e) => setIaInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendIa()}
                className="ia-text-input"
                aria-label="Mensagem para a IA"
              />
              <Button
                type="button"
                size="icon"
                onClick={handleSendIa}
                disabled={!iaInput.trim()}
                aria-label="Enviar mensagem"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL PERFIL */}
      <Dialog open={perfilOpen} onOpenChange={setPerfilOpen}>
        <DialogContent className="patient-modal perfil-modal">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <User className="text-primary" size={22} />
              Meu Perfil
            </DialogTitle>
            <DialogDescription>
              Seus dados, preferências e segurança na {clinic.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="perfil-card-summary">
            <div className="perfil-avatar-circle">AL</div>
            <div>
              <strong className="text-base block">Alex Silva</strong>
              <span className="text-xs text-muted-foreground block">
                alex.paciente@techmedicina.com.br
              </span>
              <span className="perfil-pill">Plano Ativo · {clinic.name}</span>
            </div>
          </div>

          <div className="perfil-menu-list">
            <Link
              to="/app/$section"
              params={{ section: "dependentes" }}
              className="perfil-menu-link"
              onClick={() => setPerfilOpen(false)}
            >
              <Users size={18} />
              <span>Dependentes autorizados</span>
              <ChevronRight size={16} className="text-muted-foreground ml-auto" />
            </Link>

            <Link
              to="/app/$section"
              params={{ section: "privacidade" }}
              className="perfil-menu-link"
              onClick={() => setPerfilOpen(false)}
            >
              <Shield size={18} />
              <span>Minha privacidade e termos</span>
              <ChevronRight size={16} className="text-muted-foreground ml-auto" />
            </Link>

            <button type="button" className="perfil-menu-link" onClick={toggleTheme}>
              {preferences.mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              <span>
                Tema visual: {preferences.mode === "dark" ? "Escuro" : "Claro"} (Alternar)
              </span>
            </button>

            <button
              type="button"
              className="perfil-menu-link"
              onClick={() =>
                alert(
                  `Suporte ${clinic.name}: atendimento telefônico 0800 123 4567 ou suporte@${clinic.id}.com.br`,
                )
              }
            >
              <HelpCircle size={18} />
              <span>Central de suporte</span>
              <ChevronRight size={16} className="text-muted-foreground ml-auto" />
            </button>

            <button
              type="button"
              className="perfil-menu-link logout-link text-destructive"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span>Sair da conta</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
