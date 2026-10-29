import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { createDeviceRegistrationVersionListClient } from "./registration-version-list-client";
import type { deviceRegistrationVersionListPageSchema } from "./registration-version-list-contract";
type Page = z.infer<typeof deviceRegistrationVersionListPageSchema>;
export function DeviceRegistrationVersionList({
  id,
  revision,
  getAccessToken,
  fetcher,
  onSelect,
  disabled = false,
}: {
  id: string;
  revision: number;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
  onSelect: (revision: number) => void;
  disabled?: boolean;
}) {
  const read = useMemo(
    () => createDeviceRegistrationVersionListClient(getAccessToken, fetcher),
    [getAccessToken, fetcher],
  );
  const [page, setPage] = useState<Page>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const scope = useRef<AbortController | null>(null),
    pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    scope.current = controller;
    pending.current = false;
    setPage(undefined);
    setBusy(false);
    setError(false);
    return () => controller.abort();
  }, [id, revision, read]);
  async function load(more = false) {
    const current = scope.current;
    if (!current || current.signal.aborted || pending.current || (more && !page?.nextCursor))
      return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      const next = await read({ id, ...(more ? { before: page!.nextCursor! } : {}) });
      if (!current.signal.aborted)
        setPage(more ? { ...next, items: [...page!.items, ...next.items] } : next);
    } catch {
      if (!current.signal.aborted) setError(true);
    } finally {
      if (!current.signal.aborted) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <section aria-label="Lista de versões salvas" className="space-y-3" aria-busy={busy}>
      <Button variant="outline" disabled={busy} onClick={() => void load()}>
        Listar versões salvas
      </Button>
      {busy && <p role="status">Carregando lista de versões…</p>}
      {error && <p role="alert">Não foi possível carregar a lista. Tente listar novamente.</p>}
      {page?.items.length === 0 && <p>Nenhuma versão encontrada.</p>}
      {page && (
        <ul className="grid gap-3 md:grid-cols-2">
          {page.items.map((item) => (
            <li key={item.revision} className="rounded-lg border border-border p-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">
                Revisão {item.revision} ·{" "}
                <time dateTime={item.occurredAt}>
                  {new Date(item.occurredAt).toLocaleString("pt-BR")}
                </time>
              </p>
              <Button
                variant="outline"
                disabled={disabled || busy}
                onClick={() => onSelect(item.revision)}
              >
                Consultar revisão {item.revision}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {page?.nextCursor && (
        <Button variant="outline" disabled={busy} onClick={() => void load(true)}>
          Carregar versões anteriores
        </Button>
      )}
    </section>
  );
}
