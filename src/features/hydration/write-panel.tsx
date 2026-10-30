import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HydrationRecord } from "./contracts";
import { hydrationCommandSchema, type HydrationCommand } from "./mutation-contract";
import { createHydrationMutationClient, HydrationWriteError } from "./mutation-client";
import { createHydrationRecoveryClient } from "./recovery-client";

export function HydrationWritePanel({
  scope,
  records,
  getAccessToken,
  fetcher,
  onLocked,
  onChanged,
  blocked = false,
}: {
  scope: { clinicId: string; patientId: string };
  records: HydrationRecord[];
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
  onLocked: (locked: boolean) => void;
  onChanged: () => void;
  blocked?: boolean;
}) {
  const [selected, setSelected] = useState(""),
    [volume, setVolume] = useState(""),
    [instant, setInstant] = useState(""),
    [voidConfirmed, setVoidConfirmed] = useState(false);
  const [pending, setPending] = useState<HydrationCommand | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [stale, setStale] = useState(false);
  const active = useRef(true),
    inFlight = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const current = records.find((r) => r.id === selected && r.status === "active");
  const locked = blocked || busy || pending !== null;
  function lock(value: boolean) {
    onLocked(value);
  }
  function changed(text: string) {
    setPending(null);
    setStale(true);
    setMessage(text + " Consulte o histórico novamente antes de outro registro.");
    onChanged();
    lock(false);
  }
  async function send(command: HydrationCommand) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    lock(true);
    setPending(command);
    setMessage("");
    try {
      await createHydrationMutationClient(getAccessToken, fetcher)(command, scope);
      if (active.current) changed("Registro confirmado.");
    } catch (error) {
      if (active.current) {
        if (error instanceof HydrationWriteError && error.outcome !== "uncertain") {
          setPending(null);
          lock(false);
          setMessage(error.message);
          if (error.outcome === "conflict") {
            setStale(true);
            onChanged();
          }
        } else
          setMessage(
            "Resultado não confirmado. Consulte o recibo original; não crie outro registro equivalente.",
          );
      }
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function recover() {
    if (!pending || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await createHydrationRecoveryClient(getAccessToken, fetcher)(pending, scope);
      if (active.current) {
        if (result.confirmation === "confirmed")
          changed("Recibo confirmado; o histórico considerará a revisão atual.");
        else
          setMessage(
            "Recibo ainda não encontrado. Isso não prova que a escrita falhou. Você pode consultar novamente ou repetir exatamente a solicitação original.",
          );
      }
    } catch {
      if (active.current)
        setMessage(
          "Não foi possível confirmar. Confira seu acesso e consulte novamente; não crie outro registro equivalente.",
        );
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }
  function prepare(kind: "save" | "void") {
    if (locked || stale) return;
    if (selected && !current) {
      setMessage("Registro indisponível. Atualize o histórico.");
      return;
    }
    if (kind === "void" && (!current || !voidConfirmed)) {
      setMessage("Confirme a anulação do registro selecionado.");
      return;
    }
    const parsed = hydrationCommandSchema.safeParse({
      kind: kind === "void" ? "void" : current ? "correct" : "create",
      recordId: current?.id ?? crypto.randomUUID(),
      sourceRequestId: crypto.randomUUID(),
      expectedRevision: current?.revision ?? 0,
      ...(kind === "void"
        ? {}
        : {
            document: {
              volumeMl: /^\d+$/.test(volume) ? Number(volume) : NaN,
              occurredAt: instant,
            },
          }),
    });
    if (!parsed.success) {
      setMessage(
        "Informe volume inteiro em mL e data/hora ISO com fuso, por exemplo 2026-10-30T09:00:00-03:00.",
      );
      return;
    }
    void send(parsed.data);
  }
  return (
    <section
      className="space-y-4 rounded-xl border border-border bg-card/60 p-4"
      aria-label="Registrar água"
      aria-busy={busy}
    >
      <h2 className="font-semibold">Registrar água</h2>
      <p className="text-sm text-muted-foreground">
        Registre apenas o consumo informado. Não há meta sugerida. Correções e anulações preservam o
        histórico de revisões.
      </p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          prepare("save");
        }}
      >
        <label className="block space-y-2">
          <span>Registro</span>
          <select
            className="block w-full rounded-lg border border-input bg-background p-3"
            disabled={locked || stale}
            value={selected}
            onChange={(e) => {
              const r = records.find((v) => v.id === e.target.value);
              setSelected(e.target.value);
              setVolume(r ? String(r.volumeMl) : "");
              setInstant(r?.occurredAt ?? "");
              setVoidConfirmed(false);
              setMessage("");
            }}
          >
            <option value="">Novo registro</option>
            {records
              .filter((r) => r.status === "active")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.volumeMl} mL · {r.occurredAt} · revisão {r.revision}
                </option>
              ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span>Volume registrado (mL)</span>
          <Input
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            inputMode="numeric"
            disabled={locked || stale}
          />
        </label>
        <label className="block space-y-2">
          <span>Data e hora com fuso (ISO)</span>
          <Input
            value={instant}
            onChange={(e) => setInstant(e.target.value)}
            placeholder="2026-10-30T09:00:00-03:00"
            disabled={locked || stale}
          />
        </label>
        <Button type="submit" disabled={locked || stale}>
          {current ? "Salvar correção" : "Registrar consumo"}
        </Button>
        {current && (
          <div className="space-y-2">
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={voidConfirmed}
                onChange={(e) => setVoidConfirmed(e.target.checked)}
                disabled={locked || stale}
              />
              Confirmo anular este registro, preservando suas revisões
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={locked || stale || !voidConfirmed}
              onClick={() => prepare("void")}
            >
              Anular registro
            </Button>
          </div>
        )}
      </form>
      {message && <p role="status">{message}</p>}
      {pending && (
        <div className="flex flex-wrap gap-3">
          <Button type="button" disabled={busy || blocked} onClick={() => void recover()}>
            Consultar recibo original
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || blocked}
            onClick={() => void send(pending)}
          >
            Repetir solicitação original
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        A solicitação pendente fica somente nesta sessão da tela. Fechar, recarregar ou sair perde
        essa referência; isso não cancela uma escrita enviada. Ao retornar, consulte o histórico e
        evite repetir um consumo equivalente sem confirmação.
      </p>
    </section>
  );
}
