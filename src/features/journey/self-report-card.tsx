import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { journeySelfReportInputSchema } from "./contracts";
import { journeySelfReportReceiptSchema, JourneySelfReportConflict } from "./self-report-client";
type Input = { goalId: string; sourceEventId: string; occurredAt: string };
type Props = {
  clinicId: string;
  patientId: string;
  title: string;
  input: Input;
  canReport?: boolean;
  send: (input: Input) => Promise<unknown>;
};
/** Parent supplies a stable event ID/time for this report and an authorized goal.
 * Unmounted local UI; browser permission is not server authorization.
 */
export function JourneySelfReportCard(props: Props) {
  return (
    <SelfReportCard
      key={`${props.clinicId}:${props.patientId}:${props.input.goalId}:${props.input.sourceEventId}:${props.input.occurredAt}`}
      {...props}
    />
  );
}
function SelfReportCard({ clinicId, patientId, title, input, canReport = false, send }: Props) {
  const [state, setState] = useState<"ready" | "sending" | "uncertain" | "conflict" | "confirmed">(
    "ready",
  );
  const active = useRef(true),
    pending = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function submit() {
    if (!canReport || pending.current || state === "confirmed" || state === "conflict") return;
    pending.current = true;
    setState("sending");
    try {
      const event = journeySelfReportInputSchema.parse(input);
      const receipt = journeySelfReportReceiptSchema.parse(await send(event));
      if (!active.current) return;
      if (
        receipt.clinicId !== clinicId ||
        receipt.patientId !== patientId ||
        receipt.goalId !== event.goalId ||
        receipt.sourceEventId !== event.sourceEventId ||
        Date.parse(receipt.occurredAt) !== Date.parse(event.occurredAt)
      )
        throw new Error("Unexpected receipt");
      setState("confirmed");
    } catch (error) {
      if (active.current)
        setState(error instanceof JourneySelfReportConflict ? "conflict" : "uncertain");
    } finally {
      pending.current = false;
    }
  }
  return (
    <Card aria-busy={state === "sending"}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p role="status" aria-live="polite">
          {state === "confirmed"
            ? "Registro confirmado."
            : state === "conflict"
              ? "Há um conflito neste registro. Consulte seu acompanhamento antes de criar outro."
              : state === "uncertain"
                ? "Não foi possível confirmar. Você pode reenviar o mesmo registro."
                : state === "sending"
                  ? "Confirmando registro…"
                  : "Informe apenas uma atividade que você realizou."}
        </p>
        {canReport ? (
          <Button
            variant="outline"
            onClick={submit}
            disabled={state === "sending" || state === "confirmed" || state === "conflict"}
          >
            {state === "uncertain" ? "Reenviar mesmo registro" : "Registrar atividade realizada"}
          </Button>
        ) : (
          <p>Registro indisponível neste contexto.</p>
        )}
      </CardContent>
    </Card>
  );
}
