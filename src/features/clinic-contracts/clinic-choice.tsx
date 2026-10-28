import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ClinicDirectory } from "@/features/auth/clinic-directory";
import { createContractClinicDirectoryClient } from "./directory-client";
export function ContractClinicChoice({
  value,
  onSelect,
  disabled,
  getAccessToken,
  fetcher,
}: {
  value: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}) {
  const read = useMemo(
    () => createContractClinicDirectoryClient(getAccessToken, fetcher),
    [getAccessToken, fetcher],
  );
  const [page, setPage] = useState<ClinicDirectory>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const scope = useRef<AbortController | null>(null),
    pending = useRef(false);
  useEffect(() => {
    const c = new AbortController();
    scope.current = c;
    setPage(undefined);
    setError(false);
    setBusy(false);
    pending.current = false;
    return () => c.abort();
  }, [read]);
  async function load(more = false) {
    const c = scope.current;
    if (!c || c.signal.aborted || pending.current || disabled || (more && !page?.nextCursor))
      return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      const next = await read(more ? page!.nextCursor! : undefined);
      const clinics = more ? [...page!.clinics, ...next.clinics] : next.clinics;
      if (new Set(clinics.map((v) => v.id)).size !== clinics.length)
        throw new Error("Duplicate clinic");
      if (!c.signal.aborted) setPage({ ...next, clinics });
    } catch {
      if (!c.signal.aborted) setError(true);
    } finally {
      if (!c.signal.aborted) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <div className="space-y-3">
      <Button variant="outline" disabled={disabled || busy} onClick={() => void load()}>
        Carregar clínicas do servidor
      </Button>
      {busy && <p role="status">Carregando clínicas…</p>}
      {error && (
        <p role="alert">Não foi possível consultar as clínicas. Tente carregar novamente.</p>
      )}
      {page && (
        <label className="block space-y-2">
          <span>Clínica do contrato</span>
          <select
            className="w-full rounded-lg border border-input bg-background p-3"
            value={value}
            disabled={disabled || busy}
            onChange={(e) => {
              if (e.target.value === "" || page.clinics.some((c) => c.id === e.target.value))
                onSelect(e.target.value);
            }}
          >
            <option value="">Selecione uma clínica cadastrada</option>
            {page.clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_active ? "" : " — inativa/em preparação"}
              </option>
            ))}
          </select>
        </label>
      )}
      {page?.clinics.length === 0 && <p>Nenhuma clínica cadastrada encontrada.</p>}
      {page?.hasMore && (
        <Button variant="outline" disabled={disabled || busy} onClick={() => void load(true)}>
          Carregar mais clínicas
        </Button>
      )}
    </div>
  );
}
