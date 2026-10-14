import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  goalPauseReceiptSchema,
  journeyGoalViewSchema,
  JourneyGoalPauseConflict,
  type JourneyGoalView,
} from "./goal-pause";
type Props = {
  goal: JourneyGoalView;
  canPause?: boolean;
  pause: (input: { goalId: string; expectedVersion: number }) => Promise<unknown>;
  refresh: () => Promise<unknown>;
};
/** Mount only under authenticated medical context; browser controls never authorize a write. */
export function JourneyGoalPauseCard(props: Props) {
  return (
    <GoalPauseCard
      key={`${props.goal.clinicId}:${props.goal.patientId}:${props.goal.goalId}:${props.goal.version}`}
      {...props}
    />
  );
}
function GoalPauseCard({ goal: initial, pause, refresh, canPause = false }: Props) {
  const [goal, setGoal] = useState(initial),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [message, setMessage] = useState("");
  const active = useRef(true);
  useEffect(() => {
    if (!canPause) setOpen(false);
  }, [canPause]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function suspend() {
    if (!canPause || busy || uncertain || goal.status === "paused") return;
    setBusy(true);
    setMessage("");
    try {
      const saved = goalPauseReceiptSchema.parse(
        await pause({ goalId: goal.goalId, expectedVersion: goal.version }),
      );
      if (!active.current) return;
      if (
        saved.goalId !== goal.goalId ||
        saved.clinicId !== goal.clinicId ||
        saved.patientId !== goal.patientId ||
        saved.version !== goal.version + 1
      )
        throw new Error("Unconfirmed suspension");
      setGoal({ ...goal, status: "paused", version: saved.version });
      setMessage("Meta suspensa. Registros anteriores preservados.");
    } catch (error) {
      if (!active.current) return;
      setUncertain(true);
      setMessage(
        error instanceof JourneyGoalPauseConflict
          ? "A meta mudou em outra sessão. Recarregue antes de suspender."
          : "Não foi possível confirmar a suspensão. Recarregue para verificar a meta.",
      );
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function reload() {
    if (busy) return;
    setBusy(true);
    try {
      const latest = journeyGoalViewSchema.parse(await refresh());
      if (!active.current) return;
      if (
        latest.goalId !== goal.goalId ||
        latest.clinicId !== goal.clinicId ||
        latest.patientId !== goal.patientId ||
        latest.version < goal.version
      )
        throw new Error("Unexpected goal");
      setGoal(latest);
      setUncertain(false);
      setMessage("");
    } catch {
      if (active.current) setMessage("Não foi possível recarregar a meta. Tente novamente.");
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <Card aria-busy={busy}>
      <CardHeader>
        <CardTitle>{goal.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          Estado confirmado:{" "}
          {goal.status === "paused"
            ? "suspensa"
            : goal.status === "eligible"
              ? "ativa"
              : "não aplicável"}
        </p>
        {canPause ? (
          <Button
            variant="outline"
            disabled={busy || uncertain || goal.status === "paused"}
            onClick={() => setOpen(true)}
          >
            {busy ? "Aguarde…" : "Suspender meta"}
          </Button>
        ) : (
          <p>Acesso de consulta à meta.</p>
        )}
        {message ? (
          <p role="status" aria-live="polite">
            {message}
          </p>
        ) : null}
        {uncertain ? (
          <Button variant="outline" disabled={busy} onClick={reload}>
            Recarregar meta
          </Button>
        ) : null}
        <AlertDialog open={canPause && open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Suspender esta meta?</AlertDialogTitle>
              <AlertDialogDescription>
                Novos autorrelatos desta meta ficarão bloqueados. Os registros anteriores serão
                preservados. Esta ação não altera uma prescrição.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={suspend}>Confirmar suspensão</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
