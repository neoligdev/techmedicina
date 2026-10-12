import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { domainAuditSchema } from "./domain-audit";
import type { AuditCursor } from "./administrative-audit";
export function DomainAuditPanel({
  token,
  clinicId,
  domainId,
}: {
  token: string;
  clinicId: string;
  domainId: string;
}) {
  const [audit, setAudit] = useState<z.infer<typeof domainAuditSchema> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef(false),
    running = useRef(false),
    abort = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      abort.current?.abort();
    };
  }, []);
  async function load(cursor?: AuditCursor) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setAudit(null);
    const controller = new AbortController();
    abort.current = controller;
    const deadline = setTimeout(() => controller.abort(), 20_000);
    try {
      const params = new URLSearchParams({ clinicId, domainId, ...cursor });
      const response = await fetch(`/api/platform/domain-audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Unavailable");
      const result = domainAuditSchema.parse(await response.json());
      if (result.domain.id !== domainId || result.domain.clinic_id !== clinicId)
        throw new Error("Mismatch");
      if (active.current && !controller.signal.aborted) setAudit(result);
    } catch {
      if (active.current) setError("Não foi possível confirmar a auditoria desta reserva.");
    } finally {
      clearTimeout(deadline);
      running.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <section
      aria-label="Auditoria da reserva de domínio"
      className="mt-5 space-y-3 border-t border-border pt-5"
    >
      <h4 className="font-semibold">Auditoria da reserva</h4>
      <Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>
        {busy ? "Consultando…" : "Consultar eventos da reserva"}
      </Button>
      {error && <p role="alert">{error}</p>}
      {audit && (
        <>
          <p className="break-all font-medium">{audit.domain.hostname}</p>
          {audit.events.length === 0 ? (
            <p>Nenhum evento registrado.</p>
          ) : (
            <ol className="space-y-3">
              {audit.events.map((event) => (
                <li key={event.id} className="text-sm">
                  <strong>Domínio reservado</strong>
                  <p>
                    <time dateTime={event.occurred_at}>
                      {new Date(event.occurred_at).toLocaleString("pt-BR")}
                    </time>
                  </p>
                  <p className="break-all">Autor: {event.actor_user_id}</p>
                </li>
              ))}
            </ol>
          )}
          {audit.hasMore && audit.nextCursor && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void load(audit.nextCursor ?? undefined)}
            >
              Eventos anteriores da reserva
            </Button>
          )}
        </>
      )}
    </section>
  );
}
