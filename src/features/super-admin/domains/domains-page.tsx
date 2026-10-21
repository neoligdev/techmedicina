import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Globe,
  Plus,
  RefreshCw,
  Search,
  Building2,
  ShieldAlert,
  History,
  Lock,
  Layers,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDemoClinic } from "@/features/demo/context";
import { supabase } from "@/integrations/supabase/client";
import { reservedDomainSchema } from "@/features/auth/domain-reservations";
import { DomainStatusBadge } from "./domain-status-badge";
import { DomainDnsInstructions } from "./domain-dns-instructions";
import { DomainTlsCard } from "./domain-tls-card";
import { DomainAuditModal } from "./domain-audit-modal";
import { DomainReservationForm } from "./domain-reservation-form";
import {
  formatDomainEnvironment,
  toCanonicalClinicUuid,
  type ReservedDomain,
  type DomainEnvironment,
  type DomainStatus,
} from "./types";

interface DomainsPageProps {
  clinics?: Array<{ id: string; name: string }>;
  initialClinicId?: string;
  token?: string;
}

export function DomainsPage({
  clinics: propClinics,
  initialClinicId,
  token: propToken,
}: DomainsPageProps = {}) {
  const { clinics: contextClinics, clinic: activeClinicContext } = useDemoClinic();
  const availableClinics = propClinics && propClinics.length > 0 ? propClinics : contextClinics;

  const defaultId =
    initialClinicId ||
    availableClinics[0]?.id ||
    activeClinicContext?.id ||
    "00000000-0000-4000-8000-000000000001";
  const [selectedClinicId, setSelectedClinicId] = useState<string>(defaultId);
  const [token, setToken] = useState<string>(propToken || "fixture");
  const [domains, setDomains] = useState<ReservedDomain[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [after, setAfter] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEnv, setFilterEnv] = useState<"all" | DomainEnvironment>("all");
  const [showNewReservation, setShowNewReservation] = useState(false);

  // Estados dos modais / painéis contextuais
  const [activeDnsDomain, setActiveDnsDomain] = useState<ReservedDomain | null>(null);
  const [activeTlsDomain, setActiveTlsDomain] = useState<ReservedDomain | null>(null);
  const [activeAuditDomain, setActiveAuditDomain] = useState<ReservedDomain | null>(null);

  const mounted = useRef(true);

  // Obter sessão e token real do Supabase caso exista e não tenha sido fornecido via prop
  useEffect(() => {
    mounted.current = true;
    async function resolveToken() {
      if (propToken) {
        setToken(propToken);
        return;
      }
      try {
        const { data } = await supabase.auth
          .getSession()
          .catch(() => ({ data: { session: null } }));
        if (mounted.current && data?.session?.access_token) {
          setToken(data.session.access_token);
        }
      } catch {
        // Fallback para token fixture em modo demonstrativo
      }
    }
    void resolveToken();
    return () => {
      mounted.current = false;
    };
  }, [propToken]);

  const targetClinicUuid = toCanonicalClinicUuid(selectedClinicId);

  // Carregar domínios da clínica selecionada
  const fetchDomains = useCallback(
    async (cursorAfter?: string) => {
      if (!targetClinicUuid) return;
      setBusy(true);
      setError("");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);

      try {
        const params = new URLSearchParams({ clinicId: targetClinicUuid });
        if (cursorAfter) {
          params.set("after", cursorAfter);
        }

        const response = await fetch(`/api/platform/domains?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("Acesso administrativo não autorizado");
          }
          throw new Error("Não foi possível carregar as reservas de domínio");
        }

        const raw = await response.json();
        const rows = Array.isArray(raw?.domains)
          ? raw.domains.map((item: unknown) => reservedDomainSchema.parse(item))
          : [];

        // Validar isolamento de tenant
        if (rows.some((d: { clinic_id: string }) => d.clinic_id !== targetClinicUuid)) {
          throw new Error("Tenant mismatch detectado na resposta do servidor");
        }

        if (mounted.current) {
          setDomains(rows as ReservedDomain[]);
          setHasMore(Boolean(raw?.hasMore));
          setNextCursor(raw?.nextCursor ?? null);
          if (cursorAfter) {
            setAfter(cursorAfter);
          } else {
            setAfter("");
          }
        }
      } catch (err: unknown) {
        if (mounted.current) {
          const message = err instanceof Error ? err.message : "Erro ao carregar reservas";
          setError(message);
          setDomains([]);
        }
      } finally {
        clearTimeout(timeout);
        if (mounted.current) {
          setBusy(false);
        }
      }
    },
    [targetClinicUuid, token],
  );

  useEffect(() => {
    if (targetClinicUuid) {
      void fetchDomains();
    }
  }, [fetchDomains, targetClinicUuid]);

  // Filtrar domínios da exibição por busca e ambiente
  const filteredDomains = domains.filter((d) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      d.hostname.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesEnv = filterEnv === "all" || d.environment === filterEnv;
    return matchesSearch && matchesEnv;
  });

  const selectedClinicMeta =
    availableClinics.find((c) => c.id === selectedClinicId) || availableClinics[0];

  // Métricas
  const totalDomains = domains.length;
  const pendingDomains = domains.filter((d) => d.status === "pending_verification").length;
  const portalDomains = domains.filter((d) => d.environment === "clinic_portal").length;
  const pwaDomains = domains.filter((d) => d.environment === "patient_pwa").length;

  return (
    <div className="page-content space-y-6">
      {/* Cabeçalho */}
      <div className="page-heading">
        <div>
          <span className="eyebrow">GESTÃO DA PLATAFORMA</span>
          <h1>
            Domínios White Label<span className="heading-dot">.</span>
          </h1>
          <p>
            Governança de domínios personalizados, apontamentos DNS e portais PWA das clínicas
            parceiras.
          </p>
        </div>
        <div className="network-label flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card/60 text-xs text-muted-foreground">
          <Globe size={15} className="text-primary" />
          <span>Rede Multi-Tenant Techmedicina</span>
        </div>
      </div>

      {/* Cards de Métricas Operacionais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 shadow-sm bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total de Reservas
            </CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDomains}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Domínios cadastrados na clínica
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Verificação DNS
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDomains}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Aguardando apontamento TXT</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ambientes</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portalDomains} / {pwaDomains}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Portal Gestão / PWA Paciente</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Transporte HTTPS
            </CardTitle>
            <Lock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">Pendente</div>
            <p className="text-[11px] text-muted-foreground mt-1">Sonda de TLS em homologação</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar de Controle e Filtros */}
      <Card className="border-border/60 bg-card/40 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <label
                htmlFor="select-clinic-toolbar"
                className="text-xs font-medium text-muted-foreground whitespace-nowrap"
              >
                Clínica:
              </label>
              <select
                id="select-clinic-toolbar"
                value={selectedClinicId}
                disabled={busy}
                onChange={(e) => {
                  setSelectedClinicId(e.target.value);
                  setAfter("");
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {availableClinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void fetchDomains(after || undefined)}
                className="h-9 gap-1.5 text-xs"
              >
                <RefreshCw size={14} className={busy ? "animate-spin text-primary" : ""} />
                <span>Recarregar reservas</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setShowNewReservation((prev) => !prev)}
                className="h-9 gap-1.5 text-xs font-medium"
              >
                <Plus size={15} />
                <span>{showNewReservation ? "Ocultar formulário" : "Nova reserva de domínio"}</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-border/40">
            <div className="relative flex-1 w-full">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Buscar por hostname..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <SlidersHorizontal size={14} className="text-muted-foreground" />
              <select
                value={filterEnv}
                onChange={(e) => setFilterEnv(e.target.value as "all" | DomainEnvironment)}
                className="h-8 px-2.5 rounded-md border border-input bg-background text-xs ring-offset-background"
              >
                <option value="all">Todos os ambientes</option>
                <option value="clinic_portal">Portal da Clínica</option>
                <option value="patient_pwa">PWA do Paciente</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário Colapsável de Nova Reserva */}
      {showNewReservation && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <DomainReservationForm
            clinics={availableClinics}
            selectedClinicId={targetClinicUuid}
            token={token}
            disabled={busy}
            onSuccess={(_created) => {
              void fetchDomains();
            }}
          />
        </div>
      )}

      {/* Alerta de Erro */}
      {error && (
        <div
          className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center justify-between gap-3"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchDomains()}
            className="text-xs h-7 border-destructive/30 hover:bg-destructive/15"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Listagem de Domínios */}
      <Card className="border-border/60 bg-card/60 shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-border/60">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-semibold">
                Domínios da Clínica: {selectedClinicMeta?.name || "Clínica"}
              </CardTitle>
              <CardDescription className="text-xs">
                {filteredDomains.length} de {domains.length} reserva(s) registrada(s)
              </CardDescription>
            </div>
            {busy && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <RefreshCw size={13} className="animate-spin text-primary" />
                Atualizando...
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {domains.length === 0 && !busy && !error && (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <Globe size={24} />
              </div>
              <h3 className="font-semibold text-base">Nenhum domínio reservado nesta clínica</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Cadastre um hostname para associar o portal de gestão da clínica ou o PWA dos
                pacientes à marca própria da instituição.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowNewReservation(true)}
                className="text-xs mt-2"
              >
                Cadastrar primeiro domínio
              </Button>
            </div>
          )}

          {domains.length > 0 && filteredDomains.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Nenhum domínio corresponde aos filtros de busca aplicados.
            </div>
          )}

          {filteredDomains.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground uppercase tracking-wider text-[11px]">
                    <th className="p-3 pl-4">Hostname FQDN</th>
                    <th className="p-3">Finalidade / Ambiente</th>
                    <th className="p-3">Situação</th>
                    <th className="p-3">Data de Registro</th>
                    <th className="p-3 text-right pr-4">Ações & Verificações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredDomains.map((domain) => (
                    <tr key={domain.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2">
                          <Globe size={15} className="text-primary shrink-0" />
                          <span className="font-mono font-medium text-foreground text-xs select-all">
                            {domain.hostname}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                          {formatDomainEnvironment(domain.environment)}
                        </span>
                      </td>
                      <td className="p-3">
                        <DomainStatusBadge status={domain.status} />
                      </td>
                      <td className="p-3 text-muted-foreground">
                        <time dateTime={domain.created_at}>
                          {new Date(domain.created_at).toLocaleDateString("pt-BR")}
                        </time>
                      </td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveDnsDomain(domain)}
                            className="h-7 text-[11px] px-2.5 gap-1"
                            title="Ver instruções de DNS TXT"
                            aria-label={`Ver instruções DNS de ${domain.hostname}`}
                          >
                            <Globe size={12} />
                            <span>Instruções DNS</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTlsDomain(domain)}
                            className="h-7 text-[11px] px-2.5 gap-1"
                            title="Ver status HTTPS/TLS"
                            aria-label={`Ver status HTTPS de ${domain.hostname}`}
                          >
                            <Lock size={12} />
                            <span>HTTPS/TLS</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveAuditDomain(domain)}
                            className="h-7 text-[11px] px-2.5 gap-1"
                            title="Ver auditoria de eventos"
                            aria-label={`Ver auditoria de ${domain.hostname}`}
                          >
                            <History size={12} />
                            <span>Auditoria</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {(after || hasMore) && (
            <div className="p-3 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs">
              <div>
                {after ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void fetchDomains()}
                    className="h-8 text-xs"
                  >
                    Primeira página de reservas
                  </Button>
                ) : (
                  <span className="text-muted-foreground">Primeira página</span>
                )}
              </div>

              <div>
                {hasMore && nextCursor && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void fetchDomains(nextCursor)}
                    className="h-8 text-xs"
                  >
                    Próxima página de reservas
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Painel Contextual de DNS TXT */}
      {activeDnsDomain && (
        <div className="relative animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Painel de Configuração DNS
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveDnsDomain(null)}
              className="text-xs h-7"
            >
              Fechar painel DNS
            </Button>
          </div>
          <DomainDnsInstructions domain={activeDnsDomain} />
        </div>
      )}

      {/* Painel Contextual de HTTPS/TLS */}
      {activeTlsDomain && (
        <div className="relative animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Painel de Transporte HTTPS & Certificado
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTlsDomain(null)}
              className="text-xs h-7"
            >
              Fechar painel HTTPS
            </Button>
          </div>
          <DomainTlsCard domain={activeTlsDomain} />
        </div>
      )}

      {/* Modal de Auditoria */}
      {activeAuditDomain && (
        <DomainAuditModal
          domain={activeAuditDomain}
          clinicId={targetClinicUuid}
          token={token}
          onClose={() => setActiveAuditDomain(null)}
        />
      )}
    </div>
  );
}
