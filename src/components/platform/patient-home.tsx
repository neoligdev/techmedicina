import { useState, useId, useEffect, type KeyboardEvent } from "react";
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
  Activity,
  HeartPulse,
  Info,
  Check,
} from "lucide-react";
import { useDemoClinic } from "@/features/demo/context";
import { supabase } from "@/integrations/supabase/client";
import {
  SHIELD_TIERS,
  type ShieldId,
  patientShieldOverviewSchema,
} from "@/features/journey/contracts";
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

function activatePatientCard(event: KeyboardEvent<HTMLElement>, action: () => void) {
  if (event.target !== event.currentTarget || event.repeat) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

interface NoticeItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  read: boolean;
}

export interface PatientHomeProps {
  isBlockedFinancial?: boolean | undefined;
  journeyOverview?: unknown | undefined;
  journeyStatus?: "loading" | "error" | "ready" | "insufficient_evaluations" | undefined;
  journeyError?: string | undefined;
  onRetryJourney?: (() => void) | undefined;
  isDemo?: boolean | undefined;
  hasPrescription?: boolean | undefined;
  patientName?: string | undefined;
}

function getDemoStorage(key: string, isDemo: boolean): string | null {
  if (typeof window === "undefined" || !isDemo) return null;
  try {
    return localStorage.getItem(`techmedicina_demo_${key}`);
  } catch {
    return null;
  }
}

function setDemoStorage(key: string, value: string, isDemo: boolean): void {
  if (typeof window === "undefined" || !isDemo) return;
  try {
    localStorage.setItem(`techmedicina_demo_${key}`, value);
  } catch {
    // Ambiente sem suporte a localStorage ou com cookies bloqueados
  }
}

export function PatientHome({
  isBlockedFinancial = false,
  journeyOverview,
  journeyStatus,
  journeyError,
  onRetryJourney,
  isDemo = false,
  hasPrescription,
  patientName,
}: PatientHomeProps) {
  const navigate = useNavigate();
  const { clinic, preferences } = useDemoClinic();

  // Monitoramento estrito de autenticação real no cliente:
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted && data?.user) {
          setAuthenticatedUserId(data.user.id);
        }
      })
      .catch(() => {
        // sem sessão ativa
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const nextUserId = session?.user?.id ?? null;
      setAuthenticatedUserId(nextUserId);

      // Limpeza imediata da sessão em memória ao deslogar ou trocar de usuário
      if (!nextUserId || nextUserId !== authenticatedUserId) {
        setMood(null);
        setSleep(null);
        setWaterMl(0);
        setNutritionData({
          meals: [],
          quality: "Não informada",
          summary: "Nenhuma refeição registrada hoje",
        });
        setActivityData({
          type: "",
          minutes: 0,
          intensity: "",
          summary: "Nenhuma atividade física registrada hoje",
        });
        setMedicationData({
          takenCount: 0,
          totalPrescribed: 0,
          confirmed: false,
          summary: "Nenhuma prescrição médica ativa vinculada à sua JORNADA",
        });
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [authenticatedUserId]);

  // Se houver usuário autenticado detectado, esvazia qualquer resquício demonstrativo em memória
  useEffect(() => {
    if (authenticatedUserId) {
      setMood(null);
      setSleep(null);
      setWaterMl(0);
      setNutritionData({
        meals: [],
        quality: "Não informada",
        summary: "Nenhuma refeição registrada hoje",
      });
      setActivityData({
        type: "",
        minutes: 0,
        intensity: "",
        summary: "Nenhuma atividade física registrada hoje",
      });
      setMedicationData({
        takenCount: 0,
        totalPrescribed: 0,
        confirmed: false,
        summary: "Nenhuma prescrição médica ativa vinculada à sua JORNADA",
      });
    }
  }, [authenticatedUserId]);

  // Regra de segurança auditada:
  // 1. Usuários autenticados reais NUNCA entram em modo demonstrativo (forçado a false).
  // 2. Se isDemo não for explicitamente true, adota comportamento restritivo (false).
  // 3. effectiveIsDemo só é true se NÃO houver usuário autenticado E isDemo === true.
  const effectiveIsDemo = Boolean(!authenticatedUserId && isDemo === true);

  // Flag de prescrição ativa (em modo demo é ilustrativa; em modo real requer prescrição médica confirmada)
  const isPrescriptionActive = hasPrescription ?? effectiveIsDemo;

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

  // Estados dos registros interativos com persistência demonstrativa local isolada
  const [mood, setMood] = useState<{ emoji: string; label: string } | null>(() => {
    if (!isDemo) return null;
    const saved = getDemoStorage(`mood_${clinic.id}`, isDemo);
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
    if (!isDemo) return null;
    const saved = getDemoStorage(`sleep_${clinic.id}`, isDemo);
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
    if (!isDemo) return 0;
    const saved = getDemoStorage(`water_${clinic.id}`, isDemo);
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

  // Novos modais de saúde e acompanhamento diário
  const [vitalityModalOpen, setVitalityModalOpen] = useState(false);
  const [nutritionModalOpen, setNutritionModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [medicationModalOpen, setMedicationModalOpen] = useState(false);
  const [devicesModalOpen, setDevicesModalOpen] = useState(false);

  // Estados dos registros diários de hábitos (autorrelato do cliente)
  const [nutritionData, setNutritionData] = useState<{
    meals: string[];
    quality: string;
    summary: string;
  }>(() => {
    if (!isDemo) {
      return {
        meals: [],
        quality: "Não informada",
        summary: "Nenhuma refeição registrada hoje",
      };
    }
    const saved = getDemoStorage(`nutrition_${clinic.id}`, isDemo);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return {
      meals: ["Café da manhã", "Almoço"],
      quality: "Equilibrada",
      summary: "2 refeições conscientes registradas hoje",
    };
  });

  const [activityData, setActivityData] = useState<{
    type: string;
    minutes: number;
    intensity: string;
    summary: string;
  }>(() => {
    if (!isDemo) {
      return {
        type: "",
        minutes: 0,
        intensity: "",
        summary: "Nenhuma atividade física registrada hoje",
      };
    }
    const saved = getDemoStorage(`activity_${clinic.id}`, isDemo);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return {
      type: "Caminhada moderada",
      minutes: 40,
      intensity: "Moderada",
      summary: "40 min de caminhada / treino ativo",
    };
  });

  const [medicationData, setMedicationData] = useState<{
    takenCount: number;
    totalPrescribed: number;
    confirmed: boolean;
    summary: string;
  }>(() => {
    if (!isPrescriptionActive) {
      return {
        takenCount: 0,
        totalPrescribed: 0,
        confirmed: false,
        summary: "Nenhuma prescrição médica ativa vinculada à sua JORNADA",
      };
    }
    if (!isDemo) {
      return {
        takenCount: 0,
        totalPrescribed: 1,
        confirmed: false,
        summary: "Prescrição médica ativa pendente de confirmação hoje",
      };
    }
    const saved = getDemoStorage(`medication_${clinic.id}`, isDemo);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return {
      takenCount: 2,
      totalPrescribed: 2,
      confirmed: true,
      summary: "Prescrições de hoje confirmadas (2 de 2)",
    };
  });

  // Toasts de feedback para autorrelatos
  const [nutritionToast, setNutritionToast] = useState(false);
  const [activityToast, setActivityToast] = useState(false);
  const [medicationToast, setMedicationToast] = useState(false);

  // Formulários temporários dos novos modais
  const [tempMealSelected, setTempMealSelected] = useState<string>("Almoço consciente");
  const [tempMealQuality, setTempMealQuality] = useState<string>("Equilibrada");
  const [tempActivityType, setTempActivityType] = useState<string>("Caminhada");
  const [tempActivityMinutes, setTempActivityMinutes] = useState<number>(30);
  const [tempActivityIntensity, setTempActivityIntensity] = useState<string>("Moderada");

  // Verificação e parsing de dados autorizados de JORNADA
  const parsedJourney = journeyOverview
    ? patientShieldOverviewSchema.safeParse(journeyOverview)
    : null;
  const authorizedJourney = parsedJourney?.success ? parsedJourney.data : null;

  // Determinação determinística do estado da JORNADA (PRD v0.11.3 §11.5, D124):
  // 1. loading: consulta ao servidor pendente
  // 2. error: erro de rede/API ou falha de autorização
  // 3. insufficient_evaluations: sem dias avaliáveis (evaluableDaysCount === 0 ou scoreAverageRounded === null)
  // 4. provisional: janela móvel em formação (isProvisional === true com evaluableDaysCount > 0)
  // 5. official: janela móvel completa consolidada (isProvisional === false)
  // 6. demo: simulação do perfil Alex
  // 7. unloaded: sem dados carregados ainda
  const effectiveJourneyState:
    | "loading"
    | "error"
    | "insufficient_evaluations"
    | "provisional"
    | "official"
    | "demo"
    | "unloaded" = (() => {
    if (effectiveIsDemo && !authorizedJourney) return "demo";
    if (journeyStatus === "loading") return "loading";
    if (journeyStatus === "error" || Boolean(journeyError)) return "error";
    if (journeyStatus === "insufficient_evaluations") return "insufficient_evaluations";
    if (!authorizedJourney) return "unloaded";
    if (
      authorizedJourney.state.evaluableDaysCount === 0 ||
      authorizedJourney.state.scoreAverageRounded === null
    ) {
      return "insufficient_evaluations";
    }
    if (authorizedJourney.state.isProvisional) {
      return "provisional";
    }
    return "official";
  })();

  const isProvisional = effectiveJourneyState === "provisional";
  const isOfficial = effectiveJourneyState === "official";
  const isDemoJourney = effectiveJourneyState === "demo";

  // O escudo ativo só existe se houver cálculo válido ou simulação demo autorizada
  // IMPORTANTE: Origem NUNCA é atribuído automaticamente na ausência de avaliações!
  const activeShieldTier: ShieldId | null =
    isOfficial || isProvisional
      ? (authorizedJourney?.state.activeShield ?? null)
      : isDemoJourney
        ? "ritmo"
        : null;

  const journeyAverageScore: number | null =
    isOfficial || isProvisional
      ? (authorizedJourney?.state.scoreAverageRounded ?? null)
      : isDemoJourney
        ? 42
        : null;

  const evaluableDaysCount: number =
    isOfficial || isProvisional
      ? (authorizedJourney?.state.evaluableDaysCount ?? 0)
      : isDemoJourney
        ? 7
        : 0;

  const nextShieldTier =
    isOfficial || isProvisional
      ? (authorizedJourney?.nextTier ?? null)
      : isDemoJourney
        ? SHIELD_TIERS.avanco
        : null;

  const pointsNeededToNext: number | null =
    isOfficial || isProvisional
      ? (authorizedJourney?.progress.pointsNeededToNextTier ?? null)
      : isDemoJourney && nextShieldTier && journeyAverageScore !== null
        ? Math.max(0, nextShieldTier.minScore - journeyAverageScore)
        : null;

  const currentTierInfo = activeShieldTier ? SHIELD_TIERS[activeShieldTier] : null;

  const journeyProgressPercent: number =
    isOfficial || isProvisional
      ? (authorizedJourney?.progress.progressPercentage ?? 0)
      : isDemoJourney && currentTierInfo && nextShieldTier && journeyAverageScore !== null
        ? Math.min(
            100,
            Math.max(
              0,
              Math.round(
                ((journeyAverageScore - currentTierInfo.minScore) /
                  (nextShieldTier.minScore - currentTierInfo.minScore)) *
                  100,
              ),
            ),
          )
        : 0;

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
    setDemoStorage(`mood_${clinic.id}`, JSON.stringify(selected), effectiveIsDemo);
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
    setDemoStorage(`sleep_${clinic.id}`, JSON.stringify(selected), effectiveIsDemo);
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
      setDemoStorage(`water_${clinic.id}`, String(next), effectiveIsDemo);
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

  function handleSaveNutrition() {
    const updated = {
      meals: Array.from(new Set([...nutritionData.meals, tempMealSelected])),
      quality: tempMealQuality,
      summary: `${tempMealSelected} (${tempMealQuality.toLowerCase()}) registrado`,
    };
    setNutritionData(updated);
    setDemoStorage(`nutrition_${clinic.id}`, JSON.stringify(updated), effectiveIsDemo);
    setNutritionToast(true);
    setTimeout(() => {
      setNutritionToast(false);
      setNutritionModalOpen(false);
    }, 800);
  }

  function handleSaveActivity() {
    const updated = {
      type: tempActivityType,
      minutes: tempActivityMinutes,
      intensity: tempActivityIntensity,
      summary: `${tempActivityMinutes} min de ${tempActivityType.toLowerCase()} (${tempActivityIntensity.toLowerCase()})`,
    };
    setActivityData(updated);
    setDemoStorage(`activity_${clinic.id}`, JSON.stringify(updated), effectiveIsDemo);
    setActivityToast(true);
    setTimeout(() => {
      setActivityToast(false);
      setActivityModalOpen(false);
    }, 800);
  }

  function handleSaveMedication() {
    if (!isPrescriptionActive) return;
    const updated = {
      takenCount: medicationData.totalPrescribed,
      totalPrescribed: medicationData.totalPrescribed,
      confirmed: true,
      summary: `Prescrições de hoje confirmadas (${medicationData.totalPrescribed} de ${medicationData.totalPrescribed})`,
    };
    setMedicationData(updated);
    setDemoStorage(`medication_${clinic.id}`, JSON.stringify(updated), effectiveIsDemo);
    setMedicationToast(true);
    setTimeout(() => {
      setMedicationToast(false);
      setMedicationModalOpen(false);
    }, 800);
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
          <Brand
            name={clinic.name}
            clinic
            initials={clinic.initials}
            logo={preferences.logo}
            subtitle="Meu cuidado"
          />
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
        <h1 className="patient-greeting-title">
          Olá, {patientName ?? (effectiveIsDemo ? "Alex" : "Paciente")}
        </h1>
        <p className="patient-demo-badge">
          {effectiveIsDemo
            ? "Perfil demonstrativo · Ambiente de simulação"
            : "Área do Paciente · Acompanhamento Diário"}
        </p>
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
          onKeyDown={(e) => activatePatientCard(e, () => handleProtectedNavigation("protocolos"))}
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
              activatePatientCard(
                e,
                () => void navigate({ to: "/app/$section", params: { section: "financeiro" } }),
              )
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
            onKeyDown={(e) => activatePatientCard(e, () => setScoreModalOpen(true))}
            aria-label={
              effectiveIsDemo
                ? "Meu score demonstrativo: 785 pontos fictícios. Toque para ver os limites deste exemplo"
                : "Meu score: em calibração clínica. Toque para entender a metodologia"
            }
          >
            <div className="card-top-row">
              <span className="card-label">Meu score</span>
              <ChevronRight size={20} className="card-chevron" />
            </div>
            {effectiveIsDemo ? (
              <>
                <div className="score-number-display">
                  <span className="score-big-num">785</span>
                  <span className="score-unit">pontos</span>
                </div>
                <p className="text-xs text-muted-foreground">Exemplo demonstrativo</p>
              </>
            ) : (
              <>
                <div className="score-number-display">
                  <span className="score-uncalibrated-title font-semibold text-foreground text-sm">
                    Em calibração
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Aguardando homologação clínica</p>
              </>
            )}
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
            onKeyDown={(e) => activatePatientCard(e, () => setMoodModalOpen(true))}
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
            onKeyDown={(e) => activatePatientCard(e, () => setSleepModalOpen(true))}
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
          onKeyDown={(e) => activatePatientCard(e, () => handleProtectedNavigation("hidratacao"))}
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

      {/* SEÇÃO: VITALIDADE (Índice Multidimensional em Homologação Clínica) */}
      <section className="patient-section-block">
        <article
          className="patient-vitality-card"
          aria-label="Indicador VITALIDADE: Conceito em homologação clínica"
        >
          <div className="patient-card-section-header">
            <div className="patient-card-header-left">
              <HeartPulse className="patient-card-header-icon" size={26} />
              <div>
                <h2 className="patient-card-title">VITALIDADE</h2>
                <p className="patient-card-subtitle">Índice multidimensional de saúde integral</p>
              </div>
            </div>
            <span className="patient-status-badge badge-pending">Em homologação clínica</span>
          </div>

          <p className="text-sm text-muted-foreground">
            Conceito em pesquisa científica. Sem pontuação numérica fictícia até homologação
            metodológica e clínica formal. Acompanhamento qualitativo em 5 pilares do PRD v0.11.3:
          </p>

          <div className="patient-pillars-grid">
            <div className="patient-pillar-item">
              <div className="patient-pillar-header">
                <Activity size={14} className="text-primary" />
                <span>Cardiometabólico</span>
              </div>
              <p className="patient-pillar-desc">Glicemia, pressão, lipídios e bioimpedância</p>
              <span className="text-[10px] text-primary/80 font-semibold">Em acompanhamento</span>
            </div>

            <div className="patient-pillar-item">
              <div className="patient-pillar-header">
                <Dumbbell size={14} className="text-primary" />
                <span>Atividade física</span>
              </div>
              <p className="patient-pillar-desc">Passos diários e minutos de movimento</p>
              <span className="text-[10px] text-primary/80 font-semibold">Monitorado</span>
            </div>

            <div className="patient-pillar-item">
              <div className="patient-pillar-header">
                <Moon size={14} className="text-primary" />
                <span>Sono & descanso</span>
              </div>
              <p className="patient-pillar-desc">Qualidade e rotina de repouso</p>
              <span className="text-[10px] text-primary/80 font-semibold">Monitorado</span>
            </div>

            <div className="patient-pillar-item">
              <div className="patient-pillar-header">
                <Droplets size={14} className="text-primary" />
                <span>Hábitos de vida</span>
              </div>
              <p className="patient-pillar-desc">Hidratação e nutrição consciente</p>
              <span className="text-[10px] text-primary/80 font-semibold">Ativo hoje</span>
            </div>

            <div className="patient-pillar-item">
              <div className="patient-pillar-header">
                <Smile size={14} className="text-primary" />
                <span>Bem-estar emocional</span>
              </div>
              <p className="patient-pillar-desc">Resiliência e percepção de estresse</p>
              <span className="text-[10px] text-primary/80 font-semibold">Monitorado</span>
            </div>
          </div>

          <div className="patient-disclaimer-note">
            <strong>Transparência metodológica:</strong> A VITALIDADE sintetiza tendências clínicas
            multidisciplinares. Por diretriz ética e regulatória, nenhuma nota consolidada
            arbitrária é atribuída sem homologação oficial.
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setVitalityModalOpen(true)}
              className="text-xs text-primary hover:text-primary"
            >
              <Info size={14} className="mr-1" />
              Entender metodologia de Vitalidade
            </Button>
          </div>
        </article>
      </section>

      {/* SEÇÃO: JORNADA & ESCUDOS ATIVOS */}
      <section className="patient-section-block">
        <article
          className="patient-journey-card"
          aria-label="JORNADA pessoal e Escudos conquistados"
        >
          <div className="patient-card-section-header">
            <div className="patient-card-header-left">
              <Shield className="patient-card-header-icon" size={26} />
              <div>
                <h2 className="patient-card-title">JORNADA & Meus Escudos</h2>
                <p className="patient-card-subtitle">
                  Pontuação oficial de hábitos (0 a 100 pontos)
                </p>
              </div>
            </div>
            {effectiveJourneyState === "loading" ? (
              <span className="patient-status-badge badge-pending">
                Aguardando dados do servidor
              </span>
            ) : effectiveJourneyState === "error" ? (
              <span className="patient-status-badge badge-pending">Erro de carregamento</span>
            ) : effectiveJourneyState === "insufficient_evaluations" ? (
              <span className="patient-status-badge badge-pending">Sem avaliações suficientes</span>
            ) : activeShieldTier && currentTierInfo ? (
              <span className="patient-status-badge badge-active">
                Escudo Ativo: {currentTierInfo.name}
                {isProvisional ? " (Provisório)" : ""}
              </span>
            ) : (
              <span className="patient-status-badge badge-pending">
                Aguardando dados da Jornada
              </span>
            )}
          </div>

          {activeShieldTier && currentTierInfo && nextShieldTier && journeyAverageScore !== null ? (
            <>
              <div className="journey-metrics-row">
                <div className="journey-metric-box">
                  <div className="journey-metric-label">Média da janela (7 dias)</div>
                  <div className="journey-metric-value">
                    <span>{journeyAverageScore}</span>
                    <span className="journey-metric-unit">pts</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {evaluableDaysCount} dias avaliáveis na janela
                  </span>
                </div>

                <div className="journey-metric-box">
                  <div className="journey-metric-label">Próximo escudo: {nextShieldTier.name}</div>
                  <div className="journey-metric-value">
                    <span>{pointsNeededToNext}</span>
                    <span className="journey-metric-unit">pts faltantes</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Meta mínima: {nextShieldTier.minScore} pts
                  </span>
                </div>
              </div>

              <div className="journey-progress-wrap">
                <div className="journey-progress-labels">
                  <span>Progresso para {nextShieldTier.name}</span>
                  <span className="font-semibold">{journeyProgressPercent}%</span>
                </div>
                <div className="patient-progress-track">
                  <div
                    className="patient-progress-fill"
                    role="progressbar"
                    aria-label={`Progresso para o escudo ${nextShieldTier.name}`}
                    aria-valuenow={journeyProgressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    style={{ width: `${journeyProgressPercent}%` }}
                  />
                </div>
              </div>

              {isProvisional ? (
                <div className="journey-regression-box">
                  <strong>Avaliação provisória:</strong> Janela móvel em formação (
                  {evaluableDaysCount} de 7 dias avaliáveis). A pontuação e o escudo definitivo
                  serão consolidados ao completar a janela de avaliações.
                </div>
              ) : (
                <div className="journey-regression-box">
                  <strong>Proteção contra regressão:</strong> Uma transição descendente só ocorre
                  após 3 avaliações diárias consecutivas válidas abaixo do limiar do escudo ativo (
                  {currentTierInfo.minScore} pts). Suas conquistas anteriores permanecem salvas na
                  sua história.
                </div>
              )}
            </>
          ) : effectiveJourneyState === "loading" ? (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-center my-3">
              <p className="text-sm font-medium text-foreground">Sincronizando com a clínica…</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                Consultando seus registros de hábitos e histórico da JORNADA no servidor.
              </p>
            </div>
          ) : effectiveJourneyState === "error" ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center my-3">
              <p className="text-sm font-medium text-foreground">
                Erro ao carregar dados da JORNADA
              </p>
              <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                Não foi possível consultar seus dados no momento. Por segurança clínica, nenhuma
                pontuação fictícia é exibida.
              </p>
              {onRetryJourney && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={onRetryJourney}
                >
                  Tentar novamente
                </Button>
              )}
            </div>
          ) : effectiveJourneyState === "insufficient_evaluations" ? (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-center my-3">
              <p className="text-sm font-medium text-foreground">
                Sem avaliações suficientes na janela
              </p>
              <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                A pontuação e a conquista de escudos são calculadas a partir de avaliações diárias
                válidas de hábitos. Registre suas rotinas hoje para ativar sua primeira avaliação.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-center my-3">
              <p className="text-sm font-medium text-foreground">
                Aguardando histórico homologado da JORNADA
              </p>
              <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                A pontuação e a conquista de escudos são calculadas exclusivamente pelo motor
                determinístico no servidor com base em avaliações diárias válidas. Nenhum resultado
                fictício é exibido para este perfil.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Equidade: Dispositivo opcional · 100% elegível com autorrelatos
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => void navigate({ to: "/app/$section", params: { section: "escudos" } })}
            >
              Ver todos os escudos e histórico
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </article>
      </section>

      {/* SEÇÃO: REGISTROS DO DIA (Hábitos Integrados) */}
      <section className="patient-section-block">
        <div className="patient-habits-panel">
          <div className="patient-card-section-header">
            <div className="patient-card-header-left">
              <ClipboardList className="patient-card-header-icon" size={24} />
              <div>
                <h2 className="patient-card-title">Registros de Hábitos de Hoje</h2>
                <p className="patient-card-subtitle">
                  Acompanhe sua rotina para a pontuação da JORNADA
                </p>
              </div>
            </div>
            <span className="patient-status-badge badge-neutral">Autorrelato do cliente</span>
          </div>

          <div className="patient-habits-subgrid">
            {/* 1. Alimentação */}
            <div
              className="patient-habit-item"
              role="button"
              tabIndex={0}
              onClick={() => setNutritionModalOpen(true)}
              onKeyDown={(e) => activatePatientCard(e, () => setNutritionModalOpen(true))}
              aria-label="Registrar alimentação consciente do dia"
            >
              <div>
                <div className="patient-habit-title">
                  <UtensilsCrossed size={16} className="text-primary" />
                  <span>Alimentação</span>
                </div>
                <p className="patient-habit-state">{nutritionData.summary}</p>
              </div>
              <span className="patient-habit-provenance">Autorrelato · Toque para editar</span>
            </div>

            {/* 2. Atividade física */}
            <div
              className="patient-habit-item"
              role="button"
              tabIndex={0}
              onClick={() => setActivityModalOpen(true)}
              onKeyDown={(e) => activatePatientCard(e, () => setActivityModalOpen(true))}
              aria-label="Registrar atividade física do dia"
            >
              <div>
                <div className="patient-habit-title">
                  <Dumbbell size={16} className="text-primary" />
                  <span>Atividade física</span>
                </div>
                <p className="patient-habit-state">{activityData.summary}</p>
              </div>
              <span className="patient-habit-provenance">Autorrelato · Toque para editar</span>
            </div>

            {/* 3. Medicamentos e adesão */}
            <div
              className="patient-habit-item"
              role="button"
              tabIndex={0}
              onClick={() => setMedicationModalOpen(true)}
              onKeyDown={(e) => activatePatientCard(e, () => setMedicationModalOpen(true))}
              aria-label={
                isPrescriptionActive
                  ? "Confirmar tomada de medicamentos prescritos"
                  : "Visualizar status de medicamentos prescritos"
              }
            >
              <div>
                <div className="patient-habit-title">
                  <Pill size={16} className="text-primary" />
                  <span>Medicamentos</span>
                </div>
                <p className="patient-habit-state">{medicationData.summary}</p>
              </div>
              <span className="patient-habit-provenance">
                {isPrescriptionActive
                  ? "Prescrição ativa · Toque para confirmar"
                  : "Sem prescrição pendente · Não pontuável"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: DISPOSITIVOS & SINAIS VITAIS */}
      <section className="patient-section-block">
        <article
          className="patient-devices-card"
          aria-label="Status de dispositivos de saúde conectados"
        >
          <div className="patient-card-section-header">
            <div className="patient-card-header-left">
              <Watch className="patient-card-header-icon" size={24} />
              <div>
                <h2 className="patient-card-title">Dispositivos & Evidências</h2>
                <p className="patient-card-subtitle">Sincronização de equipamentos previstos</p>
              </div>
            </div>
            <span className="patient-status-badge badge-neutral">Equipamentos</span>
          </div>

          <p className="text-sm text-muted-foreground">
            Integração com equipamentos de saúde. Sem medições falsas ou sinais vitais simulados.
          </p>

          <div className="patient-devices-list">
            {/* Pulseira H59/H59MAX */}
            <div className="patient-device-row">
              <div className="patient-device-info">
                <Watch size={20} className="text-primary" />
                <div>
                  <div className="patient-device-name">Pulseira inteligente (H59 / H59MAX)</div>
                  <div className="patient-device-status-text">
                    Frequência cardíaca, passos e descanso
                  </div>
                </div>
              </div>
              <span className="patient-status-badge badge-pending">Homologação BLE</span>
            </div>

            {/* Balança de Bioimpedância */}
            <div className="patient-device-row">
              <div className="patient-device-info">
                <Scale size={20} className="text-primary" />
                <div>
                  <div className="patient-device-name">Balança de bioimpedância</div>
                  <div className="patient-device-status-text">
                    Composição corporal e massa magra
                  </div>
                </div>
              </div>
              <span className="patient-status-badge badge-neutral">Não configurada</span>
            </div>

            {/* Anel inteligente */}
            <div className="patient-device-row">
              <div className="patient-device-info">
                <Sparkles size={20} className="text-primary" />
                <div>
                  <div className="patient-device-name">Anel inteligente</div>
                  <div className="patient-device-status-text">
                    Temperatura periférica e sono (opcional)
                  </div>
                </div>
              </div>
              <span className="patient-status-badge badge-neutral">Suporte futuro</span>
            </div>
          </div>

          <div className="patient-disclaimer-note">
            <strong>Garantia de equidade:</strong> O uso de pulseiras, balanças ou anéis é
            totalmente opcional. Clientes sem dispositivos possuem elegibilidade idêntica na JORNADA
            e podem alcançar pontuação máxima (100 pontos) e o escudo Plenitude apenas com seus
            registros diários de hábitos.
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
                <Link to="/app/$section" params={{ section: "escudos" }} className="more-link-item">
                  <Shield size={20} aria-hidden="true" />
                  <span>Meus Escudos</span>
                </Link>
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
              {effectiveIsDemo
                ? "✓ Água registrada com sucesso!"
                : "✓ Consumo de água mantido na sessão (aguardando API de prontuário)"}
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
              {effectiveIsDemo
                ? "✓ Humor registrado com sucesso!"
                : "✓ Humor mantido na sessão (aguardando API de prontuário)"}
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
              {effectiveIsDemo
                ? "✓ Sono registrado com sucesso!"
                : "✓ Registro de sono mantido na sessão (aguardando API de prontuário)"}
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
              {effectiveIsDemo
                ? "Score demonstrativo · 785 pontos"
                : "Meu score · Em calibração clínica"}
            </DialogTitle>
            <DialogDescription>
              {effectiveIsDemo
                ? "Exemplo visual com valores fictícios, sem cálculo a partir dos seus dados."
                : "O algoritmo de pontuação operacional está em processo de homologação clínica pela sua equipe de saúde. Nenhum valor fictício é atribuído à sua saúde."}
            </DialogDescription>
          </DialogHeader>

          {effectiveIsDemo ? (
            <>
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
                    <strong>Registro de bem-estar</strong>
                    <span className="text-xs text-muted-foreground block">
                      Exemplo de autorrelato
                    </span>
                  </div>
                  <span className="score-pts text-primary">+200 pts</span>
                </div>

                <div className="score-item-row">
                  <div>
                    <strong>Acompanhamento da rotina</strong>
                    <span className="text-xs text-muted-foreground block">
                      Exemplo visual de participação
                    </span>
                  </div>
                  <span className="score-pts text-primary">+255 pts</span>
                </div>
              </div>

              <div className="score-disclaimer-box">
                <p>
                  <strong>Dados demonstrativos:</strong> estes pontos não representam sua saúde ou
                  adesão real e não são a JORNADA. A JORNADA depende de metas aplicáveis e regras
                  aprovadas; possuir ou sincronizar um dispositivo não concede bônus. A VITALIDADE
                  numérica está indisponível até validação metodológica e clínica. Este exemplo não
                  constitui diagnóstico médico.
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
            </>
          ) : (
            <>
              <div className="space-y-3 py-2 text-sm text-muted-foreground">
                <p>
                  O score da plataforma reflete a consistência das suas rotinas de autocuidado,
                  incluindo hidratação, sono, nutrição consciente e atividade física.
                </p>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                  <strong className="text-foreground block mb-1">
                    Diretriz ética e de transparência
                  </strong>
                  Por segurança e conformidade ética médica, pontuações numéricas pessoais não são
                  estimadas ou inventadas. A pontuação real será ativada após a calibração com sua
                  equipe de saúde.
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" className="w-full" onClick={() => setScoreModalOpen(false)}>
                  Entendido
                </Button>
              </DialogFooter>
            </>
          )}
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

      {/* MODAL: Metodologia de VITALIDADE */}
      <Dialog open={vitalityModalOpen} onOpenChange={setVitalityModalOpen}>
        <DialogContent className="patient-modal vitality-modal max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <HeartPulse className="text-primary" size={24} />
              Metodologia VITALIDADE
            </DialogTitle>
            <DialogDescription>
              Conceito multidimensional em pesquisa clínica (PRD v0.11.3 §11.1 e §11.3).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
              <strong>Compromisso Ético e Regulatório:</strong>
              <p className="mt-1 text-xs text-amber-200/90">
                A VITALIDADE não possui pontuação numérica fictícia. Qualquer nota inventada
                violaria as boas práticas médicas e regulatórias. O acompanhamento é estritamente
                qualitativo.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Os 5 Pilares de Acompanhamento:</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="rounded border border-border/50 p-2">
                  <strong className="text-foreground">1. Cardiometabólico:</strong> Avaliação de
                  glicemia, pressão arterial, perfil lipídico e bioimpedância via exames clínicos.
                </li>
                <li className="rounded border border-border/50 p-2">
                  <strong className="text-foreground">2. Atividade Física & Movimento:</strong>{" "}
                  Passos diários, minutos ativos e regularidade de treinos aeróbicos/força.
                </li>
                <li className="rounded border border-border/50 p-2">
                  <strong className="text-foreground">3. Sono & Recuperação:</strong> Duração,
                  regularidade e qualidade percebida de repouso.
                </li>
                <li className="rounded border border-border/50 p-2">
                  <strong className="text-foreground">4. Hábitos & Estilo de Vida:</strong>{" "}
                  Hidratação diária, alimentação equilibrada e adesão ao plano de cuidado.
                </li>
                <li className="rounded border border-border/50 p-2">
                  <strong className="text-foreground">5. Bem-estar Emocional & Resiliência:</strong>{" "}
                  Gestão de estresse, humor e percepção emocional diária.
                </li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              A JORNADA e os Escudos avaliam a constância diária com metas pactuadas (0-100 pts),
              enquanto a VITALIDADE observa tendências clínicas. São entidades distintas e
              complementares.
            </p>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" onClick={() => setVitalityModalOpen(false)} className="w-full">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Registrar Alimentação */}
      <Dialog open={nutritionModalOpen} onOpenChange={setNutritionModalOpen}>
        <DialogContent className="patient-modal nutrition-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <UtensilsCrossed className="text-primary" size={24} />
              Registro de Alimentação Consciente
            </DialogTitle>
            <DialogDescription>
              Autorrelato diário informado por você para acompanhamento de hábitos.
            </DialogDescription>
          </DialogHeader>

          {nutritionToast && (
            <div className="patient-toast-success" role="status">
              {effectiveIsDemo
                ? "✓ Refeição registrada com sucesso!"
                : "✓ Refeição mantida na sessão (aguardando API de prontuário)"}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Qual refeição você deseja registrar?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["Café da manhã", "Almoço", "Jantar", "Lanche saudável"].map((meal) => (
                  <Button
                    key={meal}
                    type="button"
                    variant={tempMealSelected === meal ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTempMealSelected(meal)}
                  >
                    {meal}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Qualidade percebida da refeição:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["Equilibrada", "Leve", "Moderada", "Livre"].map((q) => (
                  <Button
                    key={q}
                    type="button"
                    variant={tempMealQuality === q ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setTempMealQuality(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              Tag: <strong>Autorrelato direto do cliente</strong> · Sem interferência de hardware.
              {!effectiveIsDemo && (
                <span className="block mt-1 text-[11px] text-amber-500/90">
                  Isolamento ético: Nenhum dado sensível de saúde é persistido no armazenamento
                  local do navegador.
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" onClick={handleSaveNutrition} className="w-full">
              Confirmar registro de refeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Registrar Atividade Física */}
      <Dialog open={activityModalOpen} onOpenChange={setActivityModalOpen}>
        <DialogContent className="patient-modal activity-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Dumbbell className="text-primary" size={24} />
              Registro de Atividade Física
            </DialogTitle>
            <DialogDescription>
              Informe o exercício realizado hoje para pontuar na JORNADA.
            </DialogDescription>
          </DialogHeader>

          {activityToast && (
            <div className="patient-toast-success" role="status">
              {effectiveIsDemo
                ? "✓ Atividade registrada com sucesso!"
                : "✓ Atividade mantida na sessão (aguardando API de prontuário)"}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Modalidade de exercício:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["Caminhada", "Corrida", "Musculação", "Funcional", "Ciclismo", "Alongamento"].map(
                  (act) => (
                    <Button
                      key={act}
                      type="button"
                      variant={tempActivityType === act ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTempActivityType(act)}
                    >
                      {act}
                    </Button>
                  ),
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Duração: {tempActivityMinutes} minutos
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((mins) => (
                  <Button
                    key={mins}
                    type="button"
                    variant={tempActivityMinutes === mins ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setTempActivityMinutes(mins)}
                  >
                    {mins} min
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Intensidade percebida:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["Leve", "Moderada", "Vigorosa"].map((intens) => (
                  <Button
                    key={intens}
                    type="button"
                    variant={tempActivityIntensity === intens ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setTempActivityIntensity(intens)}
                  >
                    {intens}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              Tag: <strong>Autorrelato manual</strong> · Elegibilidade plena mesmo sem pulseira
              inteligente.
              {!effectiveIsDemo && (
                <span className="block mt-1 text-[11px] text-amber-500/90">
                  Isolamento ético: Nenhum dado sensível de saúde é persistido no armazenamento
                  local do navegador.
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" onClick={handleSaveActivity} className="w-full">
              Confirmar registro de treino
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Medicamentos e Adesão */}
      <Dialog open={medicationModalOpen} onOpenChange={setMedicationModalOpen}>
        <DialogContent className="patient-modal medication-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Pill className="text-primary" size={24} />
              Adesão aos Medicamentos do Dia
            </DialogTitle>
            <DialogDescription>
              Confirmação das prescrições ativas orientadas pela sua equipe médica.
            </DialogDescription>
          </DialogHeader>

          {medicationToast && (
            <div className="patient-toast-success" role="status">
              {effectiveIsDemo
                ? "✓ Tomada confirmada com sucesso!"
                : "✓ Confirmação mantida na sessão (aguardando API de prontuário)"}
            </div>
          )}

          <div className="space-y-4">
            {!isPrescriptionActive ? (
              <div className="rounded-lg border border-border/80 bg-muted/30 p-4 text-center">
                <AlertCircle className="mx-auto mb-2 text-muted-foreground" size={24} />
                <strong className="text-sm font-semibold text-foreground block">
                  Nenhuma prescrição médica ativa vinculada
                </strong>
                <p className="mt-1 text-xs text-muted-foreground">
                  Você não possui receitas ou medicamentos prescritos cadastrados pela equipe
                  médica. Conforme a regra do PRD §11.4, a ausência de prescrição não gera
                  penalidade na sua JORNADA.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {effectiveIsDemo ? (
                  <>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <strong className="text-sm font-medium">
                          Complexo Vitamínico & Minerais
                        </strong>
                        <span className="block text-xs text-muted-foreground">
                          1 cápsula após o café da manhã (Demonstração Alex)
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-primary">Confirmado</span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <strong className="text-sm font-medium">Magnésio Inositol</strong>
                        <span className="block text-xs text-muted-foreground">
                          1 sachê 30 min antes de dormir (Demonstração Alex)
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-primary">Confirmado</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <strong className="text-sm font-medium">Prescrição Médica Ativa</strong>
                      <span className="block text-xs text-muted-foreground">
                        Orientação farmacológica registrada no prontuário
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      {medicationData.confirmed ? "Confirmado hoje" : "Pendente"}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              A adesão medicamentosa compõe 20% do peso na JORNADA diária quando prescrita.
              {!effectiveIsDemo && (
                <span className="block mt-1 text-[11px] text-amber-500/90">
                  Isolamento ético: O frontend não infere prescrições fictícias para pacientes
                  reais.
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              onClick={handleSaveMedication}
              className="w-full"
              disabled={!isPrescriptionActive}
            >
              {isPrescriptionActive ? "Confirmar todas as doses de hoje" : "Nenhuma dose pendente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
