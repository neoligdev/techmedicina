import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClinicContractListClient } from "./list-client";
import type { clinicContractListPageSchema } from "./list-contract";
type Page = z.infer<typeof clinicContractListPageSchema>;
export function ClinicContractLibrary({
  clinicId,
  getAccessToken,
  fetcher,
  disabled = false,
  onOpen,
  refreshKey = 0,
}: {
  clinicId: string;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
  disabled?: boolean;
  onOpen: (id: string) => void;
  refreshKey?: number;
}) {
  const read = useMemo(
    () => createClinicContractListClient(getAccessToken, fetcher),
    [getAccessToken, fetcher],
  );
  const [text, setText] = useState(""),
    [query, setQuery] = useState(""),
    [reload, setReload] = useState(0),
    [page, setPage] = useState<Page>(),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(false);
  const scope = useRef<AbortController | null>(null),
    pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    scope.current = controller;
    pending.current = true;
    setPage(undefined);
    setError(false);
    setBusy(true);
    void read({ clinicId, q: query })
      .then((p) => {
        if (!controller.signal.aborted) setPage(p);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setBusy(false);
          pending.current = false;
        }
      });
    return () => controller.abort();
  }, [read, clinicId, query, reload, refreshKey]);
  async function more() {
    const controller = scope.current;
    if (!page?.nextCursor || pending.current || !controller || controller.signal.aborted) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      const next = await read({ clinicId, q: query, after: page.nextCursor });
      if (!controller.signal.aborted) setPage({ ...next, items: [...page.items, ...next.items] });
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <section
      aria-label="Biblioteca de contratos"
      className="space-y-4 rounded-xl border border-border bg-card/60 p-4"
      aria-busy={busy}
    >
      <h3 className="font-semibold">Biblioteca de contratos</h3>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(text.trim());
          setReload((v) => v + 1);
        }}
      >
        <label>
          <span>Buscar por título</span>
          <Input
            value={text}
            maxLength={160}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
        </label>
        <Button type="submit" variant="outline" disabled={busy}>
          Pesquisar contratos
        </Button>
      </form>
      {busy && <p role="status">Carregando biblioteca…</p>}
      {error && (
        <div role="alert">
          <p>Não foi possível carregar a biblioteca.</p>
          <Button variant="outline" disabled={busy} onClick={() => setReload((v) => v + 1)}>
            Recarregar biblioteca
          </Button>
        </div>
      )}
      {page?.items.length === 0 && <p>Nenhum rascunho comercial encontrado.</p>}
      {page && (
        <ul className="grid gap-3 md:grid-cols-2">
          {page.items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border p-4">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">Rascunho · Revisão {item.revision}</p>
              <Button variant="outline" disabled={disabled || busy} onClick={() => onOpen(item.id)}>
                Abrir {item.title}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {page?.nextCursor && (
        <Button variant="outline" disabled={busy} onClick={() => void more()}>
          Carregar mais contratos
        </Button>
      )}
    </section>
  );
}
