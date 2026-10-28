import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { ContractVersionList } from "./version-list";
import { createContractVersionClient } from "./version-client";
import type { contractVersionSchema } from "./history-contract";
const money = (v: number | null) =>
  v === null
    ? "Não definido"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);
const choice = (v: boolean | null) =>
  v === null ? "Não definido" : v ? "Sim, em proposta" : "Não, em proposta";
export function ClinicContractHistory({
  id,
  clinicId,
  revision,
  getAccessToken,
  fetcher,
}: {
  id: string;
  clinicId: string;
  revision: number;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}) {
  const read = useMemo(
    () => createContractVersionClient(getAccessToken, fetcher),
    [getAccessToken, fetcher],
  );
  const [snapshot, setSnapshot] = useState<z.infer<typeof contractVersionSchema> | null>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const scope = useRef<AbortController | null>(null),
    pending = useRef(false);
  useEffect(() => {
    const c = new AbortController();
    scope.current = c;
    pending.current = false;
    setSnapshot(undefined);
    setError(false);
    setBusy(false);
    return () => c.abort();
  }, [id, clinicId, revision, read]);
  async function open(target: number) {
    const c = scope.current;
    if (!c || c.signal.aborted || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    setSnapshot(undefined);
    try {
      const v = await read({ id, clinicId, revision: target });
      if (!c.signal.aborted) setSnapshot(v);
    } catch {
      if (!c.signal.aborted) setError(true);
    } finally {
      if (!c.signal.aborted) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  const d = snapshot?.document;
  return (
    <section
      aria-label="Histórico comercial somente leitura"
      className="space-y-4 rounded-xl border border-border bg-card/60 p-5"
      aria-busy={busy}
    >
      <h3 className="font-semibold">Histórico de propostas comerciais</h3>
      <p className="text-sm text-muted-foreground">
        Versões de rascunho, sem aceite. A consulta não muda a edição atual, a cobrança ou os
        benefícios.
      </p>
      <ContractVersionList
        id={id}
        clinicId={clinicId}
        revision={revision}
        getAccessToken={getAccessToken}
        {...(fetcher ? { fetcher } : {})}
        disabled={busy}
        onSelect={(target) => void open(target)}
      />
      {busy && <p role="status">Consultando proposta histórica…</p>}
      {error && (
        <p role="alert">
          Não foi possível consultar a proposta. Selecione a revisão para tentar novamente.
        </p>
      )}
      {snapshot === null && <p role="status">Proposta histórica não encontrada.</p>}
      {snapshot && d && (
        <article
          aria-label="Condições históricas em rascunho"
          className="space-y-3 rounded-lg border border-border p-4"
        >
          <h4 className="font-semibold">{d.title}</h4>
          <p>
            Revisão {snapshot.revision} ·{" "}
            <time dateTime={snapshot.occurredAt}>
              {new Date(snapshot.occurredAt).toLocaleString("pt-BR")}
            </time>{" "}
            · Somente leitura · Sem aceite
          </p>
          <dl className="grid gap-3 md:grid-cols-2">
            {Object.entries({
              "Setup de implementação": money(d.setupCents),
              "Existe mensalidade?": choice(d.monthlyEnabled),
              Mensalidade: money(d.monthlyCents),
              "Existe cobrança por vidas?": choice(d.livesEnabled),
              "Quantidade de vidas": d.livesCount === null ? "Não definido" : String(d.livesCount),
              "Preço por titular": money(d.holderCents),
              "Preço por dependente": money(d.dependentCents),
            }).map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="whitespace-pre-wrap">{d.notes || "Sem observações comerciais."}</p>
        </article>
      )}
    </section>
  );
}
