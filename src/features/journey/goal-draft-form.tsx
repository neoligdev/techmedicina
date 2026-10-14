import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { journeyGoalDraftInputSchema, type JourneyGoalDraftInput } from "./goal-draft";
import { journeyGoalDraftReceiptSchema, JourneyGoalDraftConflict } from "./goal-draft-client";

type Props = {
  clinicId: string;
  patientId: string;
  canCreate?: boolean;
  send: (input: JourneyGoalDraftInput) => Promise<unknown>;
};
/** Local composition only. Verified medical access is enforced again by server/SQL. */
export function JourneyGoalDraftForm(props: Props) {
  return <DraftForm key={`${props.clinicId}:${props.patientId}`} {...props} />;
}
function DraftForm({ clinicId, patientId, canCreate = false, send }: Props) {
  const [kind, setKind] = useState<JourneyGoalDraftInput["kind"]>("hydration");
  const [cadence, setCadence] = useState<JourneyGoalDraftInput["cadence"]>("daily");
  const [state, setState] = useState<"ready" | "sending" | "uncertain" | "conflict" | "confirmed">(
    "ready",
  );
  const request = useRef<JourneyGoalDraftInput | null>(null);
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function submit() {
    if (!canCreate || pending.current || state === "confirmed" || state === "conflict") return;
    pending.current = true;
    setState("sending");
    try {
      request.current ??= journeyGoalDraftInputSchema.parse({
        patientId,
        kind,
        cadence,
        sourceRequestId: crypto.randomUUID(),
      });
      const input = request.current;
      const receipt = journeyGoalDraftReceiptSchema.parse(await send(input));
      if (!active.current) return;
      if (
        receipt.clinicId !== clinicId ||
        receipt.patientId !== patientId ||
        receipt.sourceRequestId !== input.sourceRequestId ||
        receipt.kind !== input.kind ||
        receipt.cadence !== input.cadence
      )
        throw new Error("Unexpected draft receipt");
      setState("confirmed");
    } catch (error) {
      if (active.current)
        setState(error instanceof JourneyGoalDraftConflict ? "conflict" : "uncertain");
    } finally {
      pending.current = false;
    }
  }
  const locked = !canCreate || state !== "ready";
  return (
    <Card aria-busy={state === "sending"}>
      <CardHeader>
        <CardTitle>Proposta de acompanhamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          Este rascunho precisa de revisão profissional. Não ativa uma meta, não gera pontuação e
          não constitui prescrição.
        </p>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="block space-y-2">
            <span>Área de cuidado</span>
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
              value={kind}
              disabled={locked}
              onChange={(event) =>
                setKind(journeyGoalDraftInputSchema.shape.kind.parse(event.target.value))
              }
            >
              <option value="hydration">Hidratação</option>
              <option value="nutrition">Alimentação</option>
              <option value="sleep">Sono</option>
              <option value="emotion">Emoções</option>
              <option value="activity">Atividade</option>
              <option value="check_in">Check-in</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span>Frequência sugerida</span>
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
              value={cadence}
              disabled={locked}
              onChange={(event) =>
                setCadence(journeyGoalDraftInputSchema.shape.cadence.parse(event.target.value))
              }
            >
              <option value="daily">Diária</option>
              <option value="weekly">Semanal</option>
            </select>
          </label>
          <p role="status" aria-live="polite">
            {state === "confirmed"
              ? "Rascunho confirmado. Aguarda revisão profissional."
              : state === "conflict"
                ? "Há um conflito. Verifique o rascunho antes de criar outra solicitação."
                : state === "uncertain"
                  ? "Não foi possível confirmar. Reenvie a mesma proposta para verificar o registro."
                  : state === "sending"
                    ? "Confirmando rascunho…"
                    : "Selecione uma proposta para revisão."}
          </p>
          {canCreate ? (
            <Button
              type="submit"
              disabled={state === "sending" || state === "confirmed" || state === "conflict"}
            >
              {state === "uncertain" ? "Reenviar mesma proposta" : "Salvar rascunho"}
            </Button>
          ) : (
            <p>Criação indisponível neste contexto.</p>
          )}
          {canCreate && state === "confirmed" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (pending.current) return;
                request.current = null;
                setKind("hydration");
                setCadence("daily");
                setState("ready");
              }}
            >
              Iniciar nova proposta
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
