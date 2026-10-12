import { useState, useId, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  Droplets,
  Scale,
  Watch,
  ClipboardList,
  Moon,
  Award,
  FileText,
  CheckCircle2,
  Pill,
  Dumbbell,
  Wallet,
  Gift,
  Plus,
  UtensilsCrossed,
  Sparkles,
  CalendarDays,
  Users,
  Share2,
  ShoppingBag,
  BookOpen,
  Clock,
  Shield,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Smile,
  Heart,
} from "lucide-react";
import { useDemoClinic } from "@/features/demo/context";
import { Brand } from "./brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PatientBottomNav } from "./patient-bottom-nav";

interface NoticeItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  read: boolean;
}

export interface PatientHomeProps {
  isBlockedFinancial?: boolean;
}

function getDemoStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setDemoStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ambiente sem suporte a localStorage ou com cookies bloqueados
  }
}

export function PatientHome({ isBlockedFinancial = false }: PatientHomeProps) {
  const navigate = useNavigate();
  const { clinic, preferences } = useDemoClinic();

  // Detecção estrita de apresentação para celular:
  // Combina largura de smartphone (<= 640px) com interação de toque (hover: none + pointer: coarse)
  // ou identificador móvel no User-Agent / parâmetro de teste (?device=mobile ou ?mobile=true).
  // Computadores (mesmo com janela redimensionada com mouse) e tablets mantêm isMobilePresentation = false.
  const [isMobilePresentation, setIsMobilePresentation] = useState<boolean>(false);

  useEffect(() => {
    function checkPresentation() {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("device") === "mobile" || params.get("mobile") === "true") {
        setIsMobilePresentation(true);
        return;
      }
      if (params.get("device") === "desktop" || params.get("desktop") === "true") {
        setIsMobilePresentation(false);
        return;
      }
      const isPhoneWidth = window.innerWidth <= 640;
      const isTouchPointer =
        window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      const isMobileUA = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
      setIsMobilePresentation(isPhoneWidth && (isTouchPointer || isMobileUA));
    }
    checkPresentation();
    window.addEventListener("resize", checkPresentation);
    return () => window.removeEventListener("resize", checkPresentation);
  }, []);

  // Estados dos registros interativos com persistência demonstrativa local
  const [mood, setMood] = useState<{ emoji: string; label: string } | null>(() => {
    const saved = getDemoStorage(`techmedicina_mood_${clinic.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { emoji: "🙂", label: "Bem" };
      }
    }
    return { emoji: "🙂", label: "Bem" };
  });

  const [sleep, setSleep] = useState<{ emoji: string; label: string } | null>(() => {
    const saved = getDemoStorage(`techmedicina_sleep_${clinic.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { emoji: "😴", label: "Bom" };
      }
    }
    return { emoji: "😴", label: "Bom" };
  });

  const [waterMl, setWaterMl] = useState<number>(() => {
    const saved = getDemoStorage(`techmedicina_water_${clinic.id}`);
    return saved ? Number(saved) || 1450 : 1450;
  });

  const waterTarget = 2500;

  // Estados de modais
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [waterModalOpen, setWaterModalOpen] = useState(false);
  const [moodModalOpen, setMoodModalOpen] = useState(false);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [moreResourcesOpen, setMoreResourcesOpen] = useState(false);

  // Status financeiro do paciente (definido pelo servidor/contrato, sem alteração pelo cliente)
  const isInadimplente = isBlockedFinancial;

  // Formulários temporários dos modais
  const [tempMood, setTempMood] = useState<string>("Bem");
  const [moodNote, setMoodNote] = useState("");
  const [moodSavedToast, setMoodSavedToast] = useState(false);

  const [tempSleep, setTempSleep] = useState<string>("Bom");
  const [sleepNote, setSleepNote] = useState("");
  const [sleepSavedToast, setSleepSavedToast] = useState(false);

  const [customWaterInput, setCustomWaterInput] = useState("");
  const [waterSavedToast, setWaterSavedToast] = useState(false);

  // Lista de avisos
  const [notices, setNotices] = useState<NoticeItem[]>([
    {
      id: "1",
      title: "Exame de sangue disponível",
      detail:
        "Os resultados do seu painel metabólico foram analisados e estão disponíveis no módulo Exames.",
      time: "Hoje, 08:30",
      read: false,
    },
    {
      id: "2",
      title: "Consulta confirmada com Dra. Camila",
      detail: "Sua teleconsulta de acompanhamento está agendada para quinta-feira às 15:00.",
      time: "Ontem, 16:45",
      read: false,
    },
  ]);

  const unreadNoticesCount = notices.filter((n) => !n.read).length;

  const moodOptions = [
    { emoji: "😞", label: "Muito mal" },
    { emoji: "🙁", label: "Indisposto" },
    { emoji: "😐", label: "Regular" },
    { emoji: "🙂", label: "Bem" },
    { emoji: "😄", label: "Excelente" },
  ];

  const sleepOptions = [
    { emoji: "😫", label: "Péssimo" },
    { emoji: "🥱", label: "Ruim" },
    { emoji: "😐", label: "Regular" },
    { emoji: "😴", label: "Bom" },
    { emoji: "✨", label: "Revigorante" },
  ];

  function handleSaveMood() {
    const selected = moodOptions.find((m) => m.label === tempMood) ?? { emoji: "🙂", label: "Bem" };
    setMood(selected);
    setDemoStorage(`techmedicina_mood_${clinic.id}`, JSON.stringify(selected));
    setMoodSavedToast(true);
    setTimeout(() => {
      setMoodSavedToast(false);
      setMoodModalOpen(false);
      setMoodNote("");
    }, 900);
  }

  function handleSaveSleep() {
    const selected = sleepOptions.find((s) => s.label === tempSleep) ?? {
      emoji: "😴",
      label: "Bom",
    };
    setSleep(selected);
    setDemoStorage(`techmedicina_sleep_${clinic.id}`, JSON.stringify(selected));
    setSleepSavedToast(true);
    setTimeout(() => {
      setSleepSavedToast(false);
      setSleepModalOpen(false);
      setSleepNote("");
    }, 900);
  }

  function handleAddWater(amount: number) {
    setWaterMl((prev) => {
      const next = prev + amount;
      setDemoStorage(`techmedicina_water_${clinic.id}`, String(next));
      return next;
    });
    setWaterSavedToast(true);
    setTimeout(() => {
      setWaterSavedToast(false);
      setWaterModalOpen(false);
      setCustomWaterInput("");
    }, 800);
  }

  function handleCustomWaterSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseInt(customWaterInput, 10);
    if (!isNaN(val) && val > 0) {
      handleAddWater(val);
    }
  }

  function markAllNoticesRead() {
    setNotices((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleProtectedNavigation(targetSlug: string) {
    if (isInadimplente && targetSlug !== "financeiro") {
      alert(
        "Acesso restrito devido a pendência financeira. Regularize seu plano pelo menu Financeiro para liberar todos os recursos.",
      );
      return;
    }
    void navigate({ to: "/app/$section", params: { section: targetSlug } });
  }

  const waterPercent = Math.min(100, Math.round((waterMl / waterTarget) * 100));

  const resolvedTextureUrl = preferences.textureUrl || "/textures/texture-3.jpg";

  return (
    <div
      className={`patient-app-wrapper ${isMobilePresentation ? "patient-home-mobile" : "patient-home-desktop"}`}
      data-presentation={isMobilePresentation ? "mobile" : "desktop"}
      style={
        isMobilePresentation
          ? ({ "--patient-mobile-texture": `url("${resolvedTextureUrl}")` } as React.CSSProperties)
          : undefined
      }
    >
      {/* TOPO: Cabeçalho compacto com Logo da clínica e Notificações */}
      <header className="patient-home-header">
        <div className="patient-header-brand">
          <Brand name={clinic.name} clinic initials={clinic.initials} logo={preferences.logo} />
        </div>

        <div className="patient-header-actions">
          {/* Sino de Notificações */}
          <button
            type="button"
            className="patient-notif-bell"
            onClick={() => setNoticesOpen(true)}
            aria-label={`Central de avisos: ${unreadNoticesCount} novos`}
          >
            <Bell size={24} />
            {unreadNoticesCount > 0 && (
              <span className="patient-notif-badge">{unreadNoticesCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* BLOCO HERO: Saudação clara e grande */}
      <section className="patient-hero-section">
        <h1 className="patient-greeting-title">Olá, Alex</h1>
        <p className="patient-demo-badge">Perfil demonstrativo · Ambiente de simulação</p>
      </section>

      {/* AVISO DE INADIMPLÊNCIA SE ATIVO */}
      {isInadimplente && (
        <section className="patient-inadimplencia-alert" role="alert">
          <AlertCircle size={22} className="text-amber-400 shrink-0" />
          <div className="alert-content">
            <strong>Pendência financeira identificada</strong>
            <p>
              Os recursos clínicos estão temporariamente restritos. Acesse o Financeiro para
              regularizar sua assinatura.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void navigate({ to: "/app/$section", params: { section: "financeiro" } })
            }
          >
            Ver fatura
          </Button>
        </section>
      )}

      {/* SEÇÃO B: Avisos (Faixa compacta) */}
      <section className="patient-section-block">
        <button
          type="button"
          className="patient-notices-banner"
          onClick={() => setNoticesOpen(true)}
          aria-label="Abrir central de avisos"
        >
          <div className="banner-left">
            <span className="banner-icon-wrap">
              <Bell size={20} />
            </span>
            <span className="banner-title">Avisos</span>
            <span className="banner-pill">
              {unreadNoticesCount > 0 ? `${unreadNoticesCount} novos` : "Sem novidades"}
            </span>
          </div>
          <ChevronRight size={22} className="banner-arrow" />
        </button>
      </section>

      {/* SEÇÃO C: Meu protocolo (Card principal) */}
      <section className="patient-section-block">
        <article
          className="patient-protocol-card"
          onClick={() => handleProtectedNavigation("protocolos")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleProtectedNavigation("protocolos")}
          aria-label="Abrir acompanhamento do Meu protocolo"
        >
          <div className="protocol-card-header">
            <div>
              <span className="protocol-badge">EM ANDAMENTO</span>
              <h2 className="protocol-title">Meu protocolo</h2>
              <p className="protocol-subtitle">Longevidade Ativa & Performance Metabólica</p>
            </div>
            <div className="card-arrow-wrap">
              <ChevronRight size={26} />
            </div>
          </div>

          <div className="protocol-progress-area">
            <div className="progress-labels">
              <span>Etapa 2 de 5 · Acompanhamento inicial</span>
              <span className="font-semibold">40%</span>
            </div>
            <div className="patient-progress-track">
              <div className="patient-progress-fill" style={{ width: "40%" }} />
            </div>
          </div>
        </article>
      </section>

      {/* SEÇÃO D: Meu plano e Meu score (Dois cards lado a lado) */}
      <section className="patient-section-block">
        <div className="patient-two-col-grid">
          {/* Card Meu plano */}
          <article
            className="patient-summary-card"
            onClick={() =>
              void navigate({ to: "/app/$section", params: { section: "financeiro" } })
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              void navigate({ to: "/app/$section", params: { section: "financeiro" } })
            }
            aria-label="Meu plano: Vitalícia Individual. Toque para abrir detalhes e financeiro"
          >
            <div className="card-top-row">
              <span className="card-label">Meu plano</span>
              <ChevronRight size={20} className="card-chevron" />
            </div>
            <p className="plan-name-text">Vitalícia Individual</p>
            <span className="plan-status-pill">Ativo</span>
          </article>

          {/* Card Meu score */}
          <article
            className="patient-summary-card"
            onClick={() => setScoreModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setScoreModalOpen(true)}
            aria-label="Meu score: 785 pontos. Toque para ver critérios e evolução"
          >
            <div className="card-top-row">
              <span className="card-label">Meu score</span>
              <ChevronRight size={20} className="card-chevron" />
            </div>
            <div className="score-number-display">
              <span className="score-big-num">785</span>
              <span className="score-unit">pontos</span>
            </div>
          </article>
        </div>
      </section>

      {/* SEÇÃO E: Humor e sono (Dois cards lado a lado) */}
      <section className="patient-section-block">
        <div className="patient-two-col-grid">
          {/* Card Como está? (Humor) */}
          <article
            className="patient-summary-card interactive-mood-card"
            onClick={() => setMoodModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setMoodModalOpen(true)}
            aria-label={`Como está: ${mood ? mood.label : "Registrar"}. Toque para registrar humor.`}
          >
            <div className="card-top-row">
              <span className="card-label">Como está?</span>
              <ChevronRight size={20} className="card-chevron" />
            </div>
            <div className="mood-value-display">
              <span className="mood-emoji">{mood?.emoji ?? "✨"}</span>
              <span className="mood-text">{mood?.label ?? "Registrar"}</span>
            </div>
          </article>

          {/* Card Seu sono */}
          <article
            className="patient-summary-card interactive-sleep-card"
            onClick={() => setSleepModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSleepModalOpen(true)}
            aria-label={`Seu sono: ${sleep ? sleep.label : "Registrar"}. Toque para registrar sono.`}
          >
            <div className="card-top-row">
              <span className="card-label">Seu sono</span>
              <ChevronRight size={20} className="card-chevron" />
            </div>
            <div className="mood-value-display">
              <span className="mood-emoji">{sleep?.emoji ?? "🌙"}</span>
              <span className="mood-text">{sleep?.label ?? "Registrar"}</span>
            </div>
          </article>
        </div>
      </section>

      {/* SEÇÃO F: Água de hoje */}
      <section className="patient-section-block">
        <article
          className="patient-water-card"
          onClick={() => handleProtectedNavigation("hidratacao")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleProtectedNavigation("hidratacao")}
          aria-label={`Água de hoje: ${waterMl} ml de ${waterTarget} ml. Toque para ver histórico completo.`}
        >
          <div className="water-card-header">
            <div className="water-title-wrap">
              <Droplets className="water-icon" size={26} />
              <div>
                <h2 className="water-title">Água de hoje</h2>
                <div className="water-values-display">
                  <span className="water-big-num">{waterMl.toLocaleString("pt-BR")} ml</span>
                  <span className="water-target-label">
                    de {waterTarget.toLocaleString("pt-BR")} ml
                  </span>
                </div>
              </div>
            </div>

            {/* Ação ÚNICA: + Água */}
            <Button
              type="button"
              className="water-quick-add-btn"
              onClick={(e) => {
                e.stopPropagation();
                setWaterModalOpen(true);
              }}
              aria-label="Registrar consumo de água"
            >
              <Plus size={18} />
              Água
            </Button>
          </div>

          <div className="patient-progress-track water-track">
            <div
              className="patient-progress-fill water-fill"
              style={{ width: `${waterPercent}%` }}
            />
          </div>
        </article>
      </section>

      {/* SEÇÃO G: Acessos rápidos (12 Atalhos Grandes e Quadrados) */}
      <section className="patient-section-block">
        <div className="section-title-bar">
          <h2 className="section-main-title">Acessos rápidos</h2>
        </div>

        {/* Grade de atalhos estritamente quadrados (aspect-ratio: 1 / 1) em três colunas no mobile */}
        <div className="patient-shortcuts-grid">
          {/* 1. Financeiro */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() =>
              void navigate({ to: "/app/$section", params: { section: "financeiro" } })
            }
            aria-label="Abrir Financeiro"
          >
            <div className="shortcut-icon-container">
              <Wallet size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label">Financeiro</span>
          </button>

          {/* 2. Água */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() => handleProtectedNavigation("hidratacao")}
            aria-label="Abrir Água"
          >
            <div className="shortcut-icon-container">
              <Droplets size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label">Água</span>
          </button>

          {/* 3. Clube de benefícios */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() => handleProtectedNavigation("beneficios")}
            aria-label="Abrir Clube de benefícios"
          >
            <div className="shortcut-icon-container">
              <Gift size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label">Clube de benefícios</span>
          </button>

          {/* 4. Balança */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() => handleProtectedNavigation("bioimpedancia")}
            aria-label="Abrir Balança e bioimpedância"
          >
            <div className="shortcut-icon-container">
              <Scale size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label">Balança</span>
          </button>

          {/* 5. Pulseira inteligente */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() => handleProtectedNavigation("saude")}
            aria-label="Abrir Pulseira inteligente e sinais vitais"
          >
            <div className="shortcut-icon-container">
              <Watch size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label" aria-hidden="true">
              <span className="label-full">Pulseira inteligente</span>
              <span className="label-short">Pulseira</span>
            </span>
          </button>

          {/* 6. Protocolo */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() => handleProtectedNavigation("protocolos")}
            aria-label="Abrir Protocolo"
          >
            <div className="shortcut-icon-container">
              <ClipboardList size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label">Protocolo</span>
          </button>

          {/* 7. Sono */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() => handleProtectedNavigation("sono")}
            aria-label="Abrir Sono"
          >
            <div className="shortcut-icon-container">
              <Moon size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label">Sono</span>
          </button>

          {/* 8. Score */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() => handleProtectedNavigation("score")}
            aria-label="Abrir Score"
          >
            <div className="shortcut-icon-container">
              <Award size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label">Score</span>
          </button>

          {/* 9. Exames */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() => handleProtectedNavigation("exames")}
            aria-label="Abrir Exames laboratoriais"
          >
            <div className="shortcut-icon-container">
              <FileText size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label">Exames</span>
          </button>

          {/* 10. Adesão */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() => handleProtectedNavigation("adesao")}
            aria-label="Abrir Adesão ao plano"
          >
            <div className="shortcut-icon-container">
              <CheckCircle2 size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label">Adesão</span>
          </button>

          {/* 11. Medicamentos */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() => handleProtectedNavigation("medicamentos")}
            aria-label="Abrir Medicamentos prescritos"
          >
            <div className="shortcut-icon-container">
              <Pill size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label">Medicamentos</span>
          </button>

          {/* 12. Treinos */}
          <button
            type="button"
            className="patient-square-shortcut"
            onClick={() => handleProtectedNavigation("treinos")}
            aria-label="Abrir Treinos e atividades físicas"
          >
            <div className="shortcut-icon-container">
              <Dumbbell size={32} strokeWidth={1.8} />
            </div>
            <span className="shortcut-text-label">Treinos</span>
          </button>
        </div>
      </section>

      {/* SEÇÃO MAIS RECURSOS (Colapsável / expansível) */}
      <section className="patient-section-block">
        <div className="patient-more-card">
          <button
            type="button"
            className="patient-more-toggle"
            onClick={() => setMoreResourcesOpen(!moreResourcesOpen)}
            aria-expanded={moreResourcesOpen}
            aria-controls="more-resources-panel"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="text-primary" size={20} />
              <span className="font-semibold text-lg">Mais recursos de cuidado</span>
            </div>
            {moreResourcesOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {moreResourcesOpen && (
            <div id="more-resources-panel" className="patient-more-content">
              <div className="patient-more-links-grid">
                <Link
                  to="/app/$section"
                  params={{ section: "alimentacao" }}
                  className="more-link-item"
                >
                  <UtensilsCrossed size={20} />
                  <span>Alimentação</span>
                </Link>

                <Link to="/app/$section" params={{ section: "habitos" }} className="more-link-item">
                  <Heart size={20} />
                  <span>Hábitos & Metas</span>
                </Link>

                <Link
                  to="/app/$section"
                  params={{ section: "consulta" }}
                  className="more-link-item"
                >
                  <CalendarDays size={20} />
                  <span>Preparar consulta</span>
                </Link>

                <Link
                  to="/app/$section"
                  params={{ section: "dependentes" }}
                  className="more-link-item"
                >
                  <Users size={20} />
                  <span>Dependentes</span>
                </Link>

                <Link
                  to="/app/$section"
                  params={{ section: "indicacoes" }}
                  className="more-link-item"
                >
                  <Share2 size={20} />
                  <span>Indique e Ganhe</span>
                </Link>

                <Link to="/app/$section" params={{ section: "loja" }} className="more-link-item">
                  <ShoppingBag size={20} />
                  <span>Loja</span>
                </Link>

                <Link to="/app/$section" params={{ section: "blog" }} className="more-link-item">
                  <BookOpen size={20} />
                  <span>Blog de saúde</span>
                </Link>

                <Link
                  to="/app/$section"
                  params={{ section: "linha-do-tempo" }}
                  className="more-link-item"
                >
                  <Clock size={20} />
                  <span>Linha do tempo</span>
                </Link>

                <button
                  type="button"
                  className="more-link-item text-left"
                  onClick={() => setSupportModalOpen(true)}
                >
                  <HelpCircle size={20} />
                  <span>Suporte da clínica</span>
                </button>

                <Link
                  to="/app/$section"
                  params={{ section: "privacidade" }}
                  className="more-link-item"
                >
                  <Shield size={20} />
                  <span>Privacidade & LGPD</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* RODAPÉ FIXO DOS 6 DESTINOS */}
      <PatientBottomNav />

      {/* ========================================================
          MODAIS E DIALOGS INTERATIVOS
         ======================================================== */}

      {/* MODAL: Central de Avisos */}
      <Dialog open={noticesOpen} onOpenChange={setNoticesOpen}>
        <DialogContent className="patient-modal notices-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Bell className="text-primary" size={24} />
              Central de Avisos
            </DialogTitle>
            <DialogDescription>
              Acompanhe notificações sobre seus exames, consultas e lembretes da clínica.
            </DialogDescription>
          </DialogHeader>

          <div className="notices-list-container">
            {notices.map((n) => (
              <article
                key={n.id}
                className={`notice-item-card ${n.read ? "is-read" : "is-unread"}`}
              >
                <div className="notice-header">
                  <strong className="notice-item-title">{n.title}</strong>
                  <span className="notice-item-time">{n.time}</span>
                </div>
                <p className="notice-item-detail">{n.detail}</p>
              </article>
            ))}
          </div>

          <DialogFooter className="flex-row justify-between items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={markAllNoticesRead}
              disabled={unreadNoticesCount === 0}
            >
              Marcar lidos
            </Button>
            <Button type="button" size="sm" onClick={() => setNoticesOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Registrar Água */}
      <Dialog open={waterModalOpen} onOpenChange={setWaterModalOpen}>
        <DialogContent className="patient-modal water-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Droplets className="text-cyan-400" size={24} />
              Registrar consumo de água
            </DialogTitle>
            <DialogDescription>
              Meta diária: {waterTarget} ml. Já consumido hoje: {waterMl} ml ({waterPercent}%).
            </DialogDescription>
          </DialogHeader>

          {waterSavedToast && (
            <div className="patient-toast-success" role="status">
              ✓ Água registrada com sucesso!
            </div>
          )}

          <div className="water-presets-grid">
            <Button
              type="button"
              variant="secondary"
              className="water-preset-btn"
              onClick={() => handleAddWater(150)}
            >
              <Droplets size={16} /> +150 ml (Xícara)
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="water-preset-btn"
              onClick={() => handleAddWater(250)}
            >
              <Droplets size={16} /> +250 ml (Copo)
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="water-preset-btn"
              onClick={() => handleAddWater(350)}
            >
              <Droplets size={16} /> +350 ml (Caneca)
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="water-preset-btn"
              onClick={() => handleAddWater(500)}
            >
              <Droplets size={16} /> +500 ml (Garrafa)
            </Button>
          </div>

          <form onSubmit={handleCustomWaterSubmit} className="water-custom-form">
            <label htmlFor="custom-water-ml" className="text-sm text-muted-foreground block mb-1">
              Ou digite outro volume (ml):
            </label>
            <div className="flex gap-2">
              <input
                id="custom-water-ml"
                type="number"
                placeholder="Ex: 300"
                value={customWaterInput}
                onChange={(e) => setCustomWaterInput(e.target.value)}
                className="patient-modal-input flex-1"
                min="10"
                max="2000"
              />
              <Button type="submit" disabled={!customWaterInput.trim()}>
                Adicionar
              </Button>
            </div>
          </form>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setWaterModalOpen(false);
                void navigate({ to: "/app/$section", params: { section: "hidratacao" } });
              }}
            >
              Ver histórico completo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Registrar Humor */}
      <Dialog open={moodModalOpen} onOpenChange={setMoodModalOpen}>
        <DialogContent className="patient-modal mood-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Smile className="text-primary" size={24} />
              Como você está se sentindo hoje?
            </DialogTitle>
            <DialogDescription>
              Selecione o emoji que melhor reflete seu estado emocional percebido.
            </DialogDescription>
          </DialogHeader>

          {moodSavedToast && (
            <div className="patient-toast-success" role="status">
              ✓ Humor registrado com sucesso!
            </div>
          )}

          <div className="emojis-picker-row" role="radiogroup" aria-label="Opções de humor">
            {moodOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={`emoji-option-btn ${tempMood === opt.label ? "is-selected" : ""}`}
                onClick={() => setTempMood(opt.label)}
                role="radio"
                aria-checked={tempMood === opt.label}
              >
                <span className="emoji-face">{opt.emoji}</span>
                <span className="emoji-name">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label htmlFor="mood-note-input" className="text-sm text-muted-foreground block mb-1">
              Relato opcional:
            </label>
            <textarea
              id="mood-note-input"
              rows={2}
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="Algo relevante sobre o seu dia?"
              className="patient-modal-textarea"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" onClick={handleSaveMood} className="w-full">
              Confirmar registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Registrar Sono */}
      <Dialog open={sleepModalOpen} onOpenChange={setSleepModalOpen}>
        <DialogContent className="patient-modal sleep-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Moon className="text-indigo-400" size={24} />
              Como foi a qualidade do seu sono?
            </DialogTitle>
            <DialogDescription>
              Avalie como você percebeu a sua noite de descanso.
            </DialogDescription>
          </DialogHeader>

          {sleepSavedToast && (
            <div className="patient-toast-success" role="status">
              ✓ Sono registrado com sucesso!
            </div>
          )}

          <div className="emojis-picker-row" role="radiogroup" aria-label="Opções de sono">
            {sleepOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={`emoji-option-btn ${tempSleep === opt.label ? "is-selected" : ""}`}
                onClick={() => setTempSleep(opt.label)}
                role="radio"
                aria-checked={tempSleep === opt.label}
              >
                <span className="emoji-face">{opt.emoji}</span>
                <span className="emoji-name">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label htmlFor="sleep-note-input" className="text-sm text-muted-foreground block mb-1">
              Relato opcional:
            </label>
            <textarea
              id="sleep-note-input"
              rows={2}
              value={sleepNote}
              onChange={(e) => setSleepNote(e.target.value)}
              placeholder="Alguma observação (acordou durante a noite, sonhos, etc.)?"
              className="patient-modal-textarea"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" onClick={handleSaveSleep} className="w-full">
              Confirmar registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Detalhes do Score */}
      <Dialog open={scoreModalOpen} onOpenChange={setScoreModalOpen}>
        <DialogContent className="patient-modal score-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Award className="text-amber-400" size={24} />
              Meu score · 785 pontos
            </DialogTitle>
            <DialogDescription>
              Critérios de constância e engajamento no seu plano de saúde.
            </DialogDescription>
          </DialogHeader>

          <div className="score-breakdown-list">
            <div className="score-item-row">
              <div>
                <strong>Hidratação diária</strong>
                <span className="text-xs text-muted-foreground block">
                  Metas de água alcançadas
                </span>
              </div>
              <span className="score-pts text-primary">+150 pts</span>
            </div>

            <div className="score-item-row">
              <div>
                <strong>Registro de descanso</strong>
                <span className="text-xs text-muted-foreground block">
                  Qualidade percebida informada
                </span>
              </div>
              <span className="score-pts text-primary">+180 pts</span>
            </div>

            <div className="score-item-row">
              <div>
                <strong>Adesão medicamentosa</strong>
                <span className="text-xs text-muted-foreground block">
                  Rotina de medicamentos cumprida
                </span>
              </div>
              <span className="score-pts text-primary">+200 pts</span>
            </div>

            <div className="score-item-row">
              <div>
                <strong>Sinais e bioimpedância</strong>
                <span className="text-xs text-muted-foreground block">
                  Aferições e sincronização ativa
                </span>
              </div>
              <span className="score-pts text-primary">+255 pts</span>
            </div>
          </div>

          <div className="score-disclaimer-box">
            <p>
              <strong>Critério transparente:</strong> Esta pontuação reflete a sua constância nas
              tarefas de cuidado e hábitos pactuados com a equipe clínica. Não constitui diagnóstico
              médico.
            </p>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setScoreModalOpen(false);
                void navigate({ to: "/app/$section", params: { section: "score" } });
              }}
            >
              Ver evolução completa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Suporte da Clínica */}
      <Dialog open={supportModalOpen} onOpenChange={setSupportModalOpen}>
        <DialogContent className="patient-modal support-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <HelpCircle className="text-primary" size={24} />
              Central de Atendimento
            </DialogTitle>
            <DialogDescription>
              Fale diretamente com os canais de suporte da {clinic.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="support-channels-list">
            <div className="support-item">
              <strong>WhatsApp da Clínica:</strong>
              <p>(11) 98765-4321 · Atendimento de seg a sex das 08h às 19h</p>
            </div>
            <div className="support-item">
              <strong>E-mail de Suporte:</strong>
              <p>atendimento@{clinic.id}.techmedicina.com.br</p>
            </div>
            <div className="support-item">
              <strong>Telefone 24 horas:</strong>
              <p>0800 770 1234 · Emergências e dúvidas de telemedicina</p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" onClick={() => setSupportModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
