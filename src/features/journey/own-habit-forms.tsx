import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import type { ownGoalSchema } from "./own-goals";
import { createSelfReportAccessClient } from "./self-report-access-client";
import { createJourneySelfReportClient, JourneySelfReportConflict } from "./self-report-client";
import { Button } from "@/components/ui/button";
type Goal = z.infer<typeof ownGoalSchema>;
type Props = {
  accessRevision?: number;
  blocked?: boolean;
  clinicId: string;
  patientId: string;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
  goals: Goal[];
  onConfirmed: () => void;
};
const names = {
  hydration: "hidratação",
  nutrition: "alimentação",
  sleep: "sono",
  emotion: "emoções",
  activity: "atividade física",
  check_in: "acompanhamento",
  medication: "medicação",
  protocol: "protocolo",
};
/** Only supported, persisted goals; no clinical quantities, prescriptions or inferred score. */
export function OwnHabitForms({
  goals,
  onConfirmed,
  accessRevision = 0,
  blocked = false,
  ...scope
}: Props) {
  const { clinicId, patientId, getAccessToken, fetcher } = scope;
  const [allowed, setAllowed] = useState(false),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const readAccess = useMemo(
    () => createSelfReportAccessClient({ clinicId, patientId, getAccessToken }, fetcher),
    [clinicId, patientId, getAccessToken, fetcher],
  );
  const send = useMemo(
    () => createJourneySelfReportClient({ clinicId, patientId, getAccessToken }, fetcher),
    [clinicId, patientId, getAccessToken, fetcher],
  );
  useEffect(() => {
    let active = true;
    setAllowed(false);
    setLoading(true);
    void readAccess()
      .then((v) => {
        if (active) setAllowed(v.canSubmit);
      })
      .catch(() => {
        if (active) setAllowed(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [readAccess, revision, accessRevision]);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Registrar hábitos realizados</h3>
      <p className="text-sm text-muted-foreground">
        Registre somente atividades que realizou. Medicação e protocolos seguem o acompanhamento
        clínico.
      </p>
      {loading ? (
        <p role="status">Verificando participação…</p>
      ) : !allowed ? (
        <p>Registro indisponível: confira sua participação e o acesso ao acompanhamento.</p>
      ) : null}
      <Button variant="outline" disabled={loading || blocked} onClick={refresh}>
        Atualizar disponibilidade
      </Button>
      <div className="grid gap-3 sm:grid-cols-2">
        {goals
          .filter(
            (g) => g.status === "eligible" && g.kind !== "medication" && g.kind !== "protocol",
          )
          .map((goal) => (
            <HabitForm
              key={`${goal.id}:${goal.version}`}
              goal={goal}
              allowed={allowed && !loading && !blocked}
              readAccess={readAccess}
              send={send}
              onConfirmed={onConfirmed}
            />
          ))}
      </div>
    </div>
  );
}
function HabitForm({
  goal,
  allowed,
  readAccess,
  send,
  onConfirmed,
}: {
  goal: Goal;
  allowed: boolean;
  readAccess: ReturnType<typeof createSelfReportAccessClient>;
  send: ReturnType<typeof createJourneySelfReportClient>;
  onConfirmed: () => void;
}) {
  const [checked, setChecked] = useState(false),
    [state, setState] = useState<"ready" | "sending" | "uncertain" | "confirmed" | "conflict">(
      "ready",
    );
  const input = useRef<{ goalId: string; sourceEventId: string; occurredAt: string } | null>(null),
    pending = useRef(false),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const at = Date.parse(input.current?.occurredAt ?? new Date().toISOString());
  const inWindow =
    at >= Date.parse(goal.effectiveFrom) &&
    (goal.expiresAt === null || at < Date.parse(goal.expiresAt));
  async function submit() {
    if (
      !allowed ||
      !checked ||
      pending.current ||
      !inWindow ||
      state === "confirmed" ||
      state === "conflict"
    )
      return;
    pending.current = true;
    setState("sending");
    try {
      const access = await readAccess();
      if (!active.current) return;
      if (!access.canSubmit) throw new Error("Participation unavailable");
      input.current ??= {
        goalId: goal.id,
        sourceEventId: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
      };
      const receipt = await send(input.current);
      if (!active.current) return;
      if (
        receipt.goalId !== input.current.goalId ||
        receipt.sourceEventId !== input.current.sourceEventId
      )
        throw new Error("Unexpected receipt");
      setState("confirmed");
      onConfirmed();
    } catch (error) {
      if (active.current)
        setState(error instanceof JourneySelfReportConflict ? "conflict" : "uncertain");
    } finally {
      pending.current = false;
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="rounded-xl border border-border bg-card/60 p-4 space-y-3"
      aria-label={`Registrar ${names[goal.kind]}`}
    >
      <p className="font-medium">{names[goal.kind]}</p>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={state === "sending" || state === "confirmed" || state === "conflict"}
        />
        Confirmo que realizei esta atividade
      </label>
      {!inWindow && <p className="text-sm">Meta fora do período de vigência.</p>}
      {state === "uncertain" && (
        <p role="status">
          Não foi possível confirmar. Reenvie o mesmo registro ou atualize a disponibilidade.
        </p>
      )}
      {state === "confirmed" && <p role="status">Registro confirmado.</p>}
      {state === "conflict" && (
        <p role="alert">
          Há conflito neste registro. Consulte seu acompanhamento antes de criar outro.
        </p>
      )}
      <Button
        type="submit"
        variant="outline"
        disabled={
          !allowed ||
          !checked ||
          !inWindow ||
          state === "sending" ||
          state === "confirmed" ||
          state === "conflict"
        }
      >
        {state === "sending"
          ? "Confirmando…"
          : state === "uncertain"
            ? "Reenviar mesmo registro"
            : "Registrar atividade realizada"}
      </Button>
    </form>
  );
}
