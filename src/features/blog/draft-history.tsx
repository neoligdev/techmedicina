import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBlogDraftVersionClient } from "./draft-version-client";
import type { blogDraftVersionSchema } from "./draft-version-contract";
export function BlogDraftHistory({
  id,
  revision,
  getAccessToken,
  fetcher,
}: {
  id: string;
  revision: number;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}) {
  const read = useMemo(
    () => createBlogDraftVersionClient(getAccessToken, fetcher),
    [getAccessToken, fetcher],
  );
  const [selected, setSelected] = useState(String(revision)),
    [snapshot, setSnapshot] = useState<z.infer<typeof blogDraftVersionSchema> | null>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const scope = useRef<AbortController | null>(null),
    pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    scope.current = controller;
    pending.current = false;
    setSelected(String(revision));
    setSnapshot(undefined);
    setError(false);
    setBusy(false);
    return () => controller.abort();
  }, [id, revision, read]);
  async function open() {
    const target = Number(selected);
    if (pending.current || !Number.isInteger(target) || target < 1 || target > revision) return;
    pending.current = true;
    const current = scope.current;
    if (!current || current.signal.aborted) {
      pending.current = false;
      return;
    }
    setBusy(true);
    setSnapshot(undefined);
    setError(false);
    try {
      const value = await read({ id, revision: target });
      if (!current.signal.aborted) setSnapshot(value);
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
    <section
      aria-label="Histórico de versões"
      className="space-y-4 rounded-xl border border-border bg-card/60 p-5"
      aria-busy={busy}
    >
      <h3 className="font-semibold">Histórico de versões</h3>
      <p className="text-sm text-muted-foreground">
        Consulte revisões de 1 a {revision}. A consulta não substitui o texto em edição e não
        publica conteúdo.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void open();
        }}
      >
        <label>
          <span>Revisão para consulta</span>
          <Input
            type="number"
            min={1}
            max={revision}
            step={1}
            value={selected}
            disabled={busy}
            onChange={(e) => setSelected(e.target.value)}
          />
        </label>
        <Button
          variant="outline"
          type="submit"
          disabled={
            busy ||
            !selected ||
            !Number.isInteger(Number(selected)) ||
            Number(selected) < 1 ||
            Number(selected) > revision
          }
        >
          Consultar versão
        </Button>
      </form>
      {busy && <p role="status">Carregando versão…</p>}
      {error && (
        <p role="alert">Não foi possível consultar. Confira seu acesso e tente novamente.</p>
      )}
      {snapshot === null && <p role="status">Versão não encontrada.</p>}
      {snapshot && (
        <article
          aria-label="Versão histórica somente leitura"
          className="space-y-3 rounded-lg border border-border p-4"
        >
          <p>
            Revisão {snapshot.revision} ·{" "}
            <time dateTime={snapshot.occurredAt}>
              {new Date(snapshot.occurredAt).toLocaleString("pt-BR")}
            </time>{" "}
            · Somente leitura
          </p>
          <h4 className="font-semibold">{snapshot.document.title}</h4>
          <p>{snapshot.document.summary}</p>
          <p className="whitespace-pre-wrap">{snapshot.document.body}</p>
          <dl>
            {(["category", "authorName", "references", "license"] as const).map((key) => (
              <div key={key}>
                <dt>
                  {
                    {
                      category: "Categoria",
                      authorName: "Autoria editorial",
                      references: "Referências",
                      license: "Licença e créditos",
                    }[key]
                  }
                </dt>
                <dd className="whitespace-pre-wrap">{snapshot.document[key] || "Não informado"}</dd>
              </div>
            ))}
          </dl>
        </article>
      )}
    </section>
  );
}
