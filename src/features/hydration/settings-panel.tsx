import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHydrationSettingsClient } from "./settings-client";
import { hydrationSettingsCommandSchema, validateHydrationSettings } from "./settings-contract";
import type { z } from "zod";
import { HydrationForegroundReminder } from "./foreground-reminder";
import { HydrationWriteError } from "./mutation-client";
type Command = z.infer<typeof hydrationSettingsCommandSchema>;
export function HydrationSettingsPanel({
  scope,
  getAccessToken,
  fetcher,
  blocked = false,
  onLocked,
}: {
  scope: { clinicId: string; patientId: string };
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
  blocked?: boolean;
  onLocked: (v: boolean) => void;
}) {
  const [loaded, setLoaded] = useState(false),
    [revision, setRevision] = useState(0),
    [goal, setGoal] = useState(""),
    [zone, setZone] = useState(""),
    [enabled, setEnabled] = useState(false),
    [times, setTimes] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<Command | null>(null),
    [message, setMessage] = useState("");
  const [confirmedPreferences, setConfirmedPreferences] =
    useState<ReturnType<typeof validateHydrationSettings>["preferences"]>(null);
  const alive = useRef(true),
    inFlight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const locked = blocked || busy || pending !== null;
  function apply(value: ReturnType<typeof validateHydrationSettings>) {
    const p = value.preferences;
    setConfirmedPreferences(p);
    setRevision(p?.revision ?? 0);
    setGoal(p?.settings.dailyGoalMl == null ? "" : String(p.settings.dailyGoalMl));
    setZone(p?.settings.timeZone ?? "");
    setEnabled(p?.settings.remindersEnabled ?? false);
    setTimes(p?.settings.reminderTimes.join(", ") ?? "");
    setLoaded(true);
    setPending(null);
    onLocked(false);
  }
  async function load() {
    if (inFlight.current || blocked) return;
    inFlight.current = true;
    setBusy(true);
    setMessage("");
    onLocked(true);
    try {
      const result = await createHydrationSettingsClient(getAccessToken, fetcher).read(
        scope,
        pending?.sourceRequestId,
      );
      if (alive.current) {
        if (pending && !result.receipt) {
          setMessage(
            "Recibo ainda não encontrado. A alteração pode estar em andamento; não crie outra solicitação.",
          );
        } else {
          if (pending) validateHydrationSettings(result, scope, pending);
          apply(result);
          setMessage(
            pending
              ? "Preferências confirmadas pelo recibo; exibindo revisão atual."
              : "Preferências carregadas. Avisos nesta tela dependem do aplicativo aberto e visível.",
          );
        }
      }
    } catch {
      if (alive.current) {
        setMessage(
          "Não foi possível carregar ou confirmar. Confira seu acesso e tente consultar novamente.",
        );
        onLocked(pending !== null);
      }
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function send(command: Command) {
    if (inFlight.current || blocked) return;
    inFlight.current = true;
    setBusy(true);
    setPending(command);
    setMessage("");
    onLocked(true);
    try {
      const result = await createHydrationSettingsClient(getAccessToken, fetcher).save(
        scope,
        command,
      );
      if (alive.current) {
        apply(result);
        setMessage(
          "Preferências salvas. Avisos nesta tela funcionam com o aplicativo aberto e visível; envio em segundo plano não está habilitado.",
        );
      }
    } catch (error) {
      if (alive.current) {
        if (error instanceof HydrationWriteError && error.outcome !== "uncertain") {
          setPending(null);
          setLoaded(false);
          onLocked(false);
          setMessage(
            "Alteração rejeitada ou em conflito. Carregue a revisão atual antes de editar novamente.",
          );
        } else
          setMessage(
            "Resultado não confirmado. Consulte o recibo ou repita somente a solicitação original.",
          );
      }
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function save() {
    if (locked || !loaded) return;
    const parsed = hydrationSettingsCommandSchema.safeParse({
      sourceRequestId: crypto.randomUUID(),
      expectedRevision: revision,
      settings: {
        dailyGoalMl: goal.trim() === "" ? null : /^\d+$/.test(goal) ? Number(goal) : NaN,
        timeZone: zone,
        remindersEnabled: enabled,
        reminderTimes:
          times.trim() === ""
            ? []
            : times
                .split(",")
                .map((v) => v.trim())
                .sort(),
      },
    });
    if (!parsed.success) {
      setMessage(
        "Confira a meta inteira positiva ou deixe em branco; selecione o fuso e horários únicos HH:mm separados por vírgula (até 24).",
      );
      return;
    }
    void send(parsed.data);
  }
  return (
    <section
      aria-label="Meta e preferências de lembretes"
      aria-busy={busy}
      className="space-y-4 rounded-xl border border-border bg-card/60 p-4"
    >
      <h2 className="font-semibold">Minha meta e horários</h2>
      <p className="text-sm text-muted-foreground">
        Meta informada por você, sem cálculo ou recomendação automática. Siga a orientação da sua
        equipe assistencial.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={busy || blocked}
        onClick={() => void load()}
      >
        {pending ? "Consultar recibo das preferências" : "Carregar preferências"}
      </Button>
      {loaded && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label className="block space-y-2">
            <span>Minha meta diária informada (mL, opcional)</span>
            <Input
              inputMode="numeric"
              value={goal}
              disabled={locked}
              onChange={(e) => setGoal(e.target.value)}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            Deixe em branco para não definir uma meta. Alterar este valor não modifica os registros
            de consumo anteriores.
          </p>
          <label className="block space-y-2">
            <span>Fuso dos lembretes</span>
            <select
              className="block rounded-lg border border-input bg-background p-3"
              value={zone}
              disabled={locked}
              onChange={(e) => setZone(e.target.value)}
            >
              <option value="">Selecione</option>
              <option value="America/Bahia">Bahia</option>
              <option value="America/Sao_Paulo">São Paulo</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={enabled}
              disabled={locked}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Quero lembretes nos horários escolhidos
          </label>
          <label className="block space-y-2">
            <span>Horários diários (HH:mm, separados por vírgula)</span>
            <Input
              value={times}
              disabled={locked}
              onChange={(e) => setTimes(e.target.value)}
              placeholder="09:00, 15:30"
            />
          </label>
          <Button type="submit" disabled={locked}>
            Salvar preferências
          </Button>
        </form>
      )}
      <HydrationForegroundReminder
        preferences={confirmedPreferences}
        paused={
          locked ||
          !enabled ||
          Boolean(
            confirmedPreferences &&
            (goal !==
              (confirmedPreferences.settings.dailyGoalMl == null
                ? ""
                : String(confirmedPreferences.settings.dailyGoalMl)) ||
              zone !== confirmedPreferences.settings.timeZone ||
              times !== confirmedPreferences.settings.reminderTimes.join(", ")),
          )
        }
      />
      {message && <p role="status">{message}</p>}
      {pending && (
        <Button
          type="button"
          variant="outline"
          disabled={busy || blocked}
          onClick={() => void send(pending)}
        >
          Repetir preferências originais
        </Button>
      )}
      <p className="text-sm text-muted-foreground">
        Avisos somente nesta tela aberta e visível, após carregar preferências confirmadas. Não há
        notificações em segundo plano nem recuperação de horários perdidos. Os avisos pausam durante
        edição ou confirmação. Solicitações pendentes ficam em memória; fechar ou recarregar a tela
        perde essa referência, sem cancelar uma alteração já enviada.
      </p>
    </section>
  );
}
