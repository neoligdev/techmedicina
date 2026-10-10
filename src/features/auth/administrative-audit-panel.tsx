import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { administrativeAuditSchema, type AuditCursor } from "./administrative-audit";
import type { z } from "zod";

export function AdministrativeAuditPanel({ token }: { token: string }) {
  const [audit, setAudit] = useState<z.infer<typeof administrativeAuditSchema> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const running = useRef(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  async function load(cursor?: AuditCursor) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    if (!cursor) setAudit(null);
    setError(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const query = cursor ? `?${new URLSearchParams(cursor).toString()}` : "";
      const response = await fetch(`/api/platform/audit${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      const parsed = administrativeAuditSchema.safeParse(
        response.status === 200 ? await response.json() : null,
      );
      if (!mounted.current || controller.signal.aborted) return;
      if (parsed.success) setAudit(parsed.data);
      else {
        if (response.status === 401 || response.status === 403) setAudit(null);
        setError(
          response.status === 401 || response.status === 403
            ? "Acesso à auditoria não autorizado. Entre novamente."
            : "Auditoria temporariamente indisponível.",
        );
      }
    } catch {
      if (mounted.current && !controller.signal.aborted)
        setError("Auditoria temporariamente indisponível.");
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section
      aria-label="Auditoria administrativa"
      className="mt-5 space-y-3 border-t border-border pt-5"
    >
      <h3 className="font-semibold">Auditoria administrativa</h3>
      <p className="text-xs text-muted-foreground">
        Criações e alterações do cadastro de clínicas. Consulta global exclusiva do Super ADM.
      </p>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>
        {busy ? "Consultando auditoria…" : "Consultar auditoria"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {audit &&
        (audit.events.length === 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            Nenhum evento administrativo registrado.
          </p>
        ) : (
          <ol className="space-y-3">
            {audit.events.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-border bg-background/40 p-4 text-sm"
              >
                <strong>
                  {event.action === "clinic_created" ? "Clínica criada" : "Clínica atualizada"}
                </strong>
                <p className="mt-1 text-muted-foreground">
                  <time dateTime={event.occurred_at}>
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "America/Bahia",
                    }).format(new Date(event.occurred_at))}
                  </time>
                </p>
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  Clínica: {event.clinic_id}
                </p>
                <p className="break-all text-xs text-muted-foreground">
                  Conta autora: {event.actor_user_id}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Campos:{" "}
                  {event.changed_fields
                    .map((field) => (field === "name" ? "nome" : "atividade"))
                    .join(", ") || "sem alteração de campos"}
                </p>
              </li>
            ))}
          </ol>
        ))}
      {audit?.hasMore && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Até 100 eventos por página. Consultar auditoria retorna aos mais recentes.
          </p>
          {audit.nextCursor && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void load(audit.nextCursor ?? undefined)}
            >
              Eventos anteriores
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
