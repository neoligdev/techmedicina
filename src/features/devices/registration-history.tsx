import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createDeviceRegistrationVersionClient } from "./registration-version-client";
import type { deviceRegistrationVersionSchema } from "./registration-version-contract";
export function DeviceRegistrationHistory({
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
    () => createDeviceRegistrationVersionClient(getAccessToken, fetcher),
    [getAccessToken, fetcher],
  );
  const [selected, setSelected] = useState(String(revision)),
    [snapshot, setSnapshot] = useState<z.infer<typeof deviceRegistrationVersionSchema> | null>(),
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
  async function open(target = Number(selected)) {
    if (pending.current || !Number.isInteger(target) || target < 1 || target > 2147483647) return;
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
        Revisão carregada no editor: {revision}. Metadados informados, somente leitura. A consulta
        não substitui a edição nem libera a integração do equipamento.
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
            max={2147483647}
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
            Number(selected) > 2147483647
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

          <p className="whitespace-pre-wrap">{snapshot.document.notes}</p>
          <dl>
            {(
              ["manufacturer", "model", "claimedIdentifier", "firmwareVersion", "lot"] as const
            ).map((key) => (
              <div key={key}>
                <dt>
                  {
                    {
                      manufacturer: "Fabricante informado",
                      model: "Modelo informado",
                      claimedIdentifier: "Identificador informado",
                      firmwareVersion: "Firmware informado",
                      lot: "Lote informado",
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
