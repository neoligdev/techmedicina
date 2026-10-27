import { useState, useEffect } from "react";
import {
  Shield,
  ArrowLeft,
  Info,
  Calendar,
  CheckCircle2,
  Lock,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  patientShieldOverviewSchema,
  SHIELD_TIERS,
  SHIELD_IDS,
  ShieldId,
  ShieldTierInfo,
  PatientShieldOverview,
} from "./contracts";
import { ShieldArtService } from "./shield-art-service";
import { ShieldArtImage } from "../super-admin/shields/components/shield-art-image";
import { ShieldArtVariant } from "../super-admin/shields/types";
import { useDemoClinic } from "@/features/demo/context";
import { shouldEnablePatientDemo } from "@/features/demo/demo-authorization";
import { supabase } from "@/integrations/supabase/client";
import { ALEX_DEMO_OVERVIEW } from "./demo-data";

export interface MyShieldsProps {
  overview?: unknown | undefined;
  clinicId?: string | undefined;
  patientId?: string | undefined;
  isDemo?: boolean | undefined;
  status?: "loading" | "error" | "ready" | undefined;
  onRetry?: (() => void) | undefined;
}

/**
 * Tela oficial de Meus Escudos e Histórico da Jornada no PWA do cliente.
 * Apresenta o escudo ativo em destaque, a galeria com as 15 variações canônicas de artes,
 * o histórico imutável de conquistas e preserva as regras de não-regressão do PRD v0.11.3 §11.5.
 */
function useSafeDemoClinic() {
  try {
    return useDemoClinic();
  } catch {
    return null;
  }
}

export function MyShields({
  overview: propOverview,
  clinicId: propClinicId,
  patientId: propPatientId,
  isDemo: propIsDemo,
  status,
  onRetry,
}: MyShieldsProps) {
  const demoClinicContext = useSafeDemoClinic();
  const activeClinic = demoClinicContext?.clinic;

  // Navegação segura sem dependência obrigatória de RouterProvider
  const handleBack = () => {
    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/app";
      }
    }
  };

  // Estado de autenticação Supabase
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.user) {
          setHasSession(true);
          setAuthenticatedUserId(data.user.id);
        } else {
          setHasSession(false);
          setAuthenticatedUserId(null);
        }
      })
      .catch(() => {
        if (mounted) {
          setHasSession(false);
          setAuthenticatedUserId(null);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setHasSession(true);
        setAuthenticatedUserId(session.user.id);
      } else {
        setHasSession(false);
        setAuthenticatedUserId(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Determina se o modo demonstrativo é efetivamente autorizado
  // 1. Usuário autenticado NUNCA entra em modo demonstrativo.
  // 2. Se isDemo prop for explicitamente passado como true, respeita se não houver usuário autenticado.
  // 3. Em produção sem sessão, isDemo é false (não simula automaticamente).
  const effectiveIsDemo = Boolean(!authenticatedUserId && propIsDemo === true);

  // Determina o overview a ser renderizado
  let activeOverview = propOverview;
  let activeClinicId = propClinicId;
  let activePatientId = propPatientId;

  // Se estiver em modo demo explicitamente ativado por prop
  if (effectiveIsDemo && activeOverview === undefined) {
    activeOverview = ALEX_DEMO_OVERVIEW;
    activeClinicId = ALEX_DEMO_OVERVIEW.clinicId;
    activePatientId = ALEX_DEMO_OVERVIEW.patientId;
  }

  // Validação estrita do overview contra o schema canônico
  const parsed = patientShieldOverviewSchema.safeParse(activeOverview);
  const data = parsed.success ? parsed.data : null;

  // Verificação estrita de escopo de clínica e paciente (PRD v0.11.3)
  const scoped = Boolean(
    data &&
    activeClinicId &&
    activePatientId &&
    data.clinicId === activeClinicId &&
    data.patientId === activePatientId &&
    data.state.clinicId === activeClinicId &&
    data.state.patientId === activePatientId &&
    data.history.every(
      (event) => event.clinicId === activeClinicId && event.patientId === activePatientId,
    ),
  );

  // Estado do modal de detalhes do escudo
  const [selectedTier, setSelectedTier] = useState<ShieldTierInfo | null>(null);

  return (
    <section className="mx-auto max-w-4xl space-y-6 p-4 pb-28 md:p-8 patient-app-wrapper">
      {/* CABEÇALHO */}
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleBack}
            aria-label="Voltar para tela inicial do cliente"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Meu Dia</span>
          </Button>

          {effectiveIsDemo && (
            <Badge variant="outline" className="text-amber-500 border-amber-500/40 text-xs">
              Perfil demonstrativo
            </Badge>
          )}
        </div>

        <div>
          <p className="text-sm text-muted-foreground">JORNADA · Acompanhamento</p>
          <h1 className="text-3xl font-semibold">Meus Escudos</h1>
          <p className="mt-2 text-muted-foreground">
            Suas conquistas fazem parte da sua história. Uma mudança no escudo ativo preserva as
            conquistas anteriores.
          </p>
        </div>
      </header>

      {/* ESTADOS DE CARREGAMENTO / ERRO / NÃO AUTORIZADO */}
      {!scoped || !data ? (
        <div className="space-y-6">
          {status === "loading" ? (
            <Card>
              <CardHeader>
                <CardTitle>Aguardando dados do servidor…</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Consultando o acompanhamento da JORNADA junto à clínica.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sincronizando registros e histórico no servidor…
                </p>
              </CardContent>
            </Card>
          ) : status === "error" ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle>Erro ao carregar seus Escudos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>
                  Não foi possível carregar seus Escudos no momento. Por segurança clínica, nenhuma
                  pontuação fictícia é exibida.
                </p>
                {onRetry && (
                  <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                    Tentar novamente
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Seu histórico estará aqui</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Nenhum histórico autorizado foi carregado. A conexão com seu acompanhamento está
                  em preparação.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Não há pontuação ou conquista atribuída nesta tela.
                </p>
              </CardContent>
            </Card>
          )}

          {/* GALERIA INFORMATIVA DOS 5 NÍVEIS DA JORNADA (SEM DADOS SIMULADOS) */}
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Conheça os 5 Escudos da JORNADA</h2>
              <p className="text-sm text-muted-foreground">
                Critérios determinísticos do PRD v0.11.3 §11.5. Toque em qualquer escudo para ver os
                requisitos.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {Object.values(SHIELD_TIERS).map((tier) => {
                const art = ShieldArtService.getShieldArt(tier.id, "locked");
                return (
                  <Card
                    key={tier.id}
                    className="cursor-pointer transition-all hover:border-primary/50"
                    onClick={() => setSelectedTier(tier)}
                  >
                    <CardContent className="space-y-2 pt-6 text-center">
                      <div className="h-16 w-16 mx-auto flex items-center justify-center">
                        {art ? (
                          <ShieldArtImage
                            className="h-16 w-16 object-contain"
                            svg={art.svgContent}
                            label={art.accessibilityLabel}
                          />
                        ) : (
                          <Shield aria-hidden="true" className="h-9 w-9 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="font-semibold">{tier.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {tier.minScore} a {tier.maxScore} pts
                      </p>
                      <Badge variant="secondary" className="text-xs font-normal">
                        Nível {tier.rank}
                      </Badge>
                      <p className="text-xs text-muted-foreground">Arte oficial em aprovação</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* CARD HERO: ESCUDO ATIVO EM DESTAQUE OU ESTADO DE AVALIAÇÕES INSUFICIENTES */}
          <Card className="border-primary/30 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                {data.state.evaluableDaysCount === 0 || data.state.scoreAverageRounded === null ? (
                  <>
                    <CardTitle>Sem avaliações suficientes na janela</CardTitle>
                    <Badge variant="outline" className="text-amber-500 border-amber-500/40">
                      Aguardando avaliações
                    </Badge>
                  </>
                ) : (
                  <>
                    <CardTitle>
                      Escudo ativo: {SHIELD_TIERS[data.state.activeShield].name}
                    </CardTitle>
                    {data.state.isProvisional ? (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/40">
                        Avaliação provisória ({data.state.evaluableDaysCount}/7 dias)
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                        Nível {SHIELD_TIERS[data.state.activeShield].rank}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.state.evaluableDaysCount === 0 || data.state.scoreAverageRounded === null ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                  <p>
                    Você ainda não possui dias avaliáveis suficientes para cálculo consolidado de um
                    escudo. Seus registros diários de hábitos (alimentação, atividade física, sono e
                    hidratação) construirão sua pontuação da JORNADA.
                  </p>
                </div>
              ) : (
                /* Arte do Escudo Ativo */
                <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
                  <div className="h-28 w-28 shrink-0 flex items-center justify-center rounded-2xl bg-slate-900/40 p-2 border border-slate-700/40">
                    {(() => {
                      const activeArt = ShieldArtService.getShieldArt(
                        data.state.activeShield,
                        "active",
                      );
                      return activeArt ? (
                        <ShieldArtImage
                          className="h-full w-full object-contain drop-shadow"
                          svg={activeArt.svgContent}
                          label={activeArt.accessibilityLabel}
                        />
                      ) : (
                        <Shield aria-hidden="true" className="h-16 w-16 text-primary" />
                      );
                    })()}
                  </div>

                  <div className="space-y-1 text-center sm:text-left flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {SHIELD_TIERS[data.state.activeShield].description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Faixa do nível: {SHIELD_TIERS[data.state.activeShield].minScore} a{" "}
                      {SHIELD_TIERS[data.state.activeShield].maxScore} pontos na JORNADA.
                    </p>
                  </div>
                </div>
              )}

              {data.state.isProvisional && (
                <p>Estado provisório: acompanhamento ainda em formação.</p>
              )}

              <p>
                JORNADA: {data.state.scoreAverageRounded ?? "indisponível"}
                {data.state.scoreAverageRounded !== null ? " pontos" : ""}
              </p>
              <p>{data.state.evaluableDaysCount} dias avaliáveis na janela.</p>

              {/* PROGRESSO PARA O PRÓXIMO NÍVEL */}
              {data.state.isProvisional ? (
                <p>O progresso será mostrado quando houver acompanhamento suficiente.</p>
              ) : data.nextTier ? (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-medium">Próximo escudo: {data.nextTier.name}</p>
                    <span className="text-muted-foreground font-mono">
                      {data.progress.progressPercentage}%
                    </span>
                  </div>
                  <progress
                    className="h-2 w-full accent-primary rounded-full overflow-hidden"
                    aria-label="Progresso para o próximo escudo"
                    max={100}
                    value={data.progress.progressPercentage}
                  />
                  <p className="text-sm">
                    {data.progress.pointsNeededToNextTier} pontos até o próximo nível, conforme os
                    critérios em homologação.
                  </p>
                </div>
              ) : (
                <p>Você está no último nível da JORNADA.</p>
              )}

              {/* NOTA ÉTICA DE VITALIDADE E REGULATÓRIO */}
              <div className="pt-2 border-t border-border/60 text-sm space-y-1">
                <p>VITALIDADE: indisponível/não calculada.</p>
                <p className="text-sm text-muted-foreground">
                  Critérios de Escudos em homologação; não representam avaliação clínica.
                </p>
              </div>

              {/* REGRA DE REGRESSÃO E NÃO-REGRESSÃO HISTÓRICA */}
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">
                  Regra de Proteção do Histórico (PRD §11.5):
                </p>
                <p>
                  Uma transição descendente só ocorre após 3 avaliações diárias consecutivas abaixo
                  do limiar. Suas conquistas anteriores permanecem salvas na sua história como maior
                  escudo já conquistado ({SHIELD_TIERS[data.state.highestShieldEarned].name}).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* GALERIA DOS 15 ESCUDOS CANÔNICOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Galeria de Escudos</h2>
                <p className="text-sm text-muted-foreground">
                  Coleção oficial dos 5 níveis e variações de conquista da JORNADA
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {Object.values(SHIELD_TIERS).map((tier) => {
                const earned = data.history.some(
                  (event) =>
                    event.shield === tier.id &&
                    (event.action === "promotion" ||
                      event.action === "initial" ||
                      event.action === "reacquisition"),
                );
                const active = data.state.activeShield === tier.id;
                const isNext = data.nextTier?.id === tier.id;

                const variant: ShieldArtVariant = active ? "active" : earned ? "earned" : "locked";

                const art = ShieldArtService.getShieldArt(tier.id, variant);

                return (
                  <Card
                    key={tier.id}
                    className={`cursor-pointer transition-all hover:border-primary/60 flex flex-col justify-between ${
                      active ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedTier(tier)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver detalhes do escudo ${tier.name}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedTier(tier);
                      }
                    }}
                  >
                    <CardContent className="space-y-2 pt-6 text-center flex-1 flex flex-col items-center justify-center">
                      <div className="h-20 w-20 flex items-center justify-center mb-1">
                        {art ? (
                          <ShieldArtImage
                            className="h-full w-full object-contain drop-shadow"
                            svg={art.svgContent}
                            label={art.accessibilityLabel}
                          />
                        ) : (
                          <Shield aria-hidden="true" className="h-9 w-9 text-primary" />
                        )}
                      </div>

                      <h2 className="font-semibold text-base">{tier.name}</h2>

                      <p className="text-xs text-muted-foreground font-mono">
                        {tier.minScore}–{tier.maxScore} pts
                      </p>

                      <p className="text-sm font-medium">
                        {active ? "Ativo" : earned ? "Conquistado" : "Bloqueado"}
                      </p>

                      {!art && (
                        <p className="text-xs text-muted-foreground">Arte oficial em aprovação</p>
                      )}

                      {isNext && !active && (
                        <span className="text-[11px] text-primary font-medium">
                          Próximo objetivo
                        </span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* HISTÓRICO DE CONQUISTAS */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de conquistas</CardTitle>
              <CardDescription>
                Registros imutáveis de promoção, manutenção e evolução pessoal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.history.length === 0 ? (
                <p>Nenhuma conquista registrada.</p>
              ) : (
                <ul className="space-y-4">
                  {data.history.map((event) => (
                    <li key={event.id} className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-medium text-base">{SHIELD_TIERS[event.shield].name}</h3>
                        <Badge variant="outline" className="text-xs capitalize">
                          {event.action === "promotion"
                            ? "Promoção"
                            : event.action === "initial"
                              ? "Conquista Inicial"
                              : event.action === "regression"
                                ? "Transição Descendente"
                                : "Manutenção"}
                        </Badge>
                      </div>

                      <time
                        dateTime={event.occurredAt}
                        className="block text-xs text-muted-foreground"
                      >
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "America/Bahia",
                        }).format(new Date(event.occurredAt))}{" "}
                        · America/Bahia
                      </time>

                      <div className="text-sm text-foreground/90 space-y-1">
                        <p>JORNADA: {event.scoreAverage ?? "indisponível"}</p>
                        <p>VITALIDADE: indisponível/não calculada.</p>
                      </div>

                      <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
                        {event.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* DIALOG DE DETALHAMENTO DO ESCUDO */}
      <Dialog open={Boolean(selectedTier)} onOpenChange={(open) => !open && setSelectedTier(null)}>
        <DialogContent className="max-w-md">
          {selectedTier && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        selectedTier.id === "origem"
                          ? "#D97706"
                          : selectedTier.id === "ritmo"
                            ? "#F59E0B"
                            : selectedTier.id === "avanco"
                              ? "#10B981"
                              : selectedTier.id === "equilibrio"
                                ? "#3B82F6"
                                : "#8B5CF6",
                    }}
                  />
                  <DialogTitle>Escudo {selectedTier.name}</DialogTitle>
                </div>
                <DialogDescription>
                  Nível {selectedTier.rank} da JORNADA · Faixa de {selectedTier.minScore} a{" "}
                  {selectedTier.maxScore} pontos
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="h-32 w-32 mx-auto flex items-center justify-center p-2 rounded-2xl bg-slate-900/30 border border-slate-700/30">
                  {(() => {
                    const isEarned =
                      data?.history.some((e) => e.shield === selectedTier.id) ?? false;
                    const isActive = data?.state.activeShield === selectedTier.id;
                    const variant: ShieldArtVariant = isActive
                      ? "active"
                      : isEarned
                        ? "earned"
                        : "locked";
                    const art = ShieldArtService.getShieldArt(selectedTier.id, variant);
                    return art ? (
                      <ShieldArtImage
                        className="h-full w-full object-contain"
                        svg={art.svgContent}
                        label={art.accessibilityLabel}
                      />
                    ) : (
                      <Shield aria-hidden="true" className="h-16 w-16 text-primary" />
                    );
                  })()}
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <h4 className="font-semibold text-foreground">Significado Oficial</h4>
                    <p className="text-muted-foreground">{selectedTier.description}</p>
                  </div>

                  <div className="border-t border-border pt-2">
                    <h4 className="font-semibold text-foreground">Requisitos de Conquista</h4>
                    <p className="text-muted-foreground">
                      Manter média de {selectedTier.minScore} a {selectedTier.maxScore} pontos na
                      janela móvel de 7 dias avaliáveis na JORNADA através dos seus hábitos diários.
                    </p>
                  </div>

                  {data && (
                    <div className="border-t border-border pt-2 text-xs text-muted-foreground">
                      <p>
                        Status no seu perfil:{" "}
                        <strong className="text-foreground">
                          {data.state.activeShield === selectedTier.id
                            ? "Atualmente Ativo"
                            : data.history.some((e) => e.shield === selectedTier.id)
                              ? "Conquistado"
                              : "Bloqueado"}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setSelectedTier(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
