import React, { useEffect, useRef, useState, useCallback } from "react";
import { History, X, Clock, User, AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { domainAuditSchema } from "@/features/auth/domain-audit";
import type { AuditCursor } from "@/features/auth/administrative-audit";
import type { ReservedDomain } from "./types";
import { DomainStatusBadge } from "./domain-status-badge";

interface DomainAuditModalProps {
  domain: ReservedDomain;
  clinicId: string;
  token: string;
  onClose: () => void;
}

export function DomainAuditModal({ domain, clinicId, token, onClose }: DomainAuditModalProps) {
  const [events, setEvents] = useState<
    Array<{
      id: string;
      domain_id: string;
      actor_user_id: string;
      action: string;
      occurred_at: string;
    }>
  >([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<AuditCursor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);

  const load = useCallback(
    async (cursor?: AuditCursor) => {
      setBusy(true);
      setError("");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);

      try {
        const params = new URLSearchParams({
          clinicId,
          domainId: domain.id,
        });
        if (cursor?.before && cursor?.beforeId) {
          params.set("before", cursor.before);
          params.set("beforeId", cursor.beforeId);
        }

        const response = await fetch(`/api/platform/domain-audit?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Erro na consulta de auditoria");
        }

        const raw = await response.json();
        const parsed = domainAuditSchema.parse(raw);

        if (parsed.domain.id !== domain.id || parsed.domain.clinic_id !== clinicId) {
          throw new Error("Dados de auditoria divergentes do domínio solicitado");
        }

        if (active.current) {
          if (cursor) {
            setEvents((prev) => [...prev, ...parsed.events]);
          } else {
            setEvents(parsed.events);
          }
          setHasMore(parsed.hasMore);
          setNextCursor(parsed.nextCursor);
        }
      } catch {
        if (active.current) {
          setError("Não foi possível confirmar o histórico de auditoria desta reserva.");
        }
      } finally {
        clearTimeout(timeout);
        if (active.current) {
          setBusy(false);
        }
      }
    },
    [domain.id, clinicId, token],
  );

  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
    };
  }, [load]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <History size={18} />
            </div>
            <div>
              <h3 id="audit-modal-title" className="font-semibold text-base">
                Histórico & Auditoria de Reserva
              </h3>
              <p className="text-xs text-muted-foreground font-mono">{domain.hostname}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
            aria-label="Fechar auditoria"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info do Domínio */}
        <div className="bg-muted/30 px-4 py-3 border-b border-border/60 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status Atual:</span>
            <DomainStatusBadge status={domain.status} />
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>Revisão: #{domain.revision}</span>
            <span>Registrado em: {new Date(domain.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2"
              role="alert"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {busy && events.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
              <RefreshCw size={20} className="animate-spin text-primary" />
              <span>Consultando registros de auditoria no servidor…</span>
            </div>
          )}

          {!busy && events.length === 0 && !error && (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Nenhum evento registrado para esta reserva.
            </div>
          )}

          {events.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Trilha de Auditoria Imutável:
              </span>
              <ol className="relative border-l border-border/80 ml-3 space-y-4">
                {events.map((event) => (
                  <li key={event.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-primary border border-background" />
                    <div className="p-3 rounded-lg border border-border/60 bg-background/50 space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <strong className="text-xs font-semibold text-foreground">
                          {event.action === "domain_reserved"
                            ? "Domínio Reservado com Sucesso"
                            : event.action}
                        </strong>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock size={12} />
                          <time dateTime={event.occurred_at}>
                            {new Date(event.occurred_at).toLocaleString("pt-BR")}
                          </time>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User size={13} className="shrink-0" />
                        <span className="font-mono text-[11px] break-all">
                          Autor da operação: {event.actor_user_id}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground/75 font-mono">
                        ID do Evento: {event.id}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {hasMore && nextCursor && (
            <div className="pt-2 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void load(nextCursor)}
                className="text-xs"
              >
                {busy ? "Carregando…" : "Carregar eventos anteriores"}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
