import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createDeviceRegistrationListClient } from "./registration-list-client";
import type { deviceRegistrationListPageSchema } from "./registration-list-contract";
type Page = z.infer<typeof deviceRegistrationListPageSchema>;
export function DeviceRegistrationLibrary({
  getAccessToken,
  fetcher,
  disabled = false,
  onOpen,
  refreshKey = 0,
}: {
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
  disabled?: boolean;
  onOpen: (id: string) => void;
  refreshKey?: number;
}) {
  const read = useMemo(
    () => createDeviceRegistrationListClient(getAccessToken, fetcher),
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
    void read({ q: query })
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
  }, [read, query, reload, refreshKey]);
  async function more() {
    const controller = scope.current;
    if (!page?.nextCursor || pending.current || !controller || controller.signal.aborted) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      const next = await read({ q: query, after: page.nextCursor });
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
      aria-label="Cadastros de unidades"
      className="space-y-4 rounded-xl border border-border bg-card/60 p-4"
      aria-busy={busy}
    >
      <h3 className="font-semibold">Cadastros de unidades</h3>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(text.trim());
          setReload((v) => v + 1);
        }}
      >
        <label>
          <span>Buscar título, modelo ou identificador</span>
          <Input
            value={text}
            maxLength={160}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
        </label>
        <Button type="submit" variant="outline" disabled={busy}>
          Pesquisar cadastros
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
      {page?.items.length === 0 && <p>Nenhum cadastro encontrado.</p>}
      {page && (
        <ul className="grid gap-3 md:grid-cols-2">
          {page.items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border p-4">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">Rascunho · Revisão {item.revision}</p>
              <p className="text-sm text-muted-foreground">
                Modelo informado: {item.model || "Não informado"} · Identificador declarado:{" "}
                {item.claimedIdentifier || "Não informado"}
              </p>
              <p className="text-sm text-muted-foreground">
                Firmware informado: {item.firmwareVersion || "Não informado"} · Sem liberação de
                integração
              </p>
              <Button variant="outline" disabled={disabled || busy} onClick={() => onOpen(item.id)}>
                Abrir {item.title}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {page?.nextCursor && (
        <Button variant="outline" disabled={busy} onClick={() => void more()}>
          Carregar mais cadastros
        </Button>
      )}
    </section>
  );
}
