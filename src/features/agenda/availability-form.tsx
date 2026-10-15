import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { availabilityProposalSchema, availabilityReceiptSchema } from "./availability";
import { clinicTimeToInstant } from "./local-time";
import { AvailabilityConflict } from "./availability-client";
type Proposal = ReturnType<typeof availabilityProposalSchema.parse>;
type Props = {
  clinicId: string;
  doctorUserId: string;
  timeZone: string;
  canWrite?: boolean;
  send: (value: Proposal) => Promise<unknown>;
};
export function AvailabilityForm(props: Props) {
  return (
    <Form
      key={`${props.clinicId}:${props.doctorUserId}:${props.timeZone}:${Boolean(props.canWrite)}`}
      {...props}
    />
  );
}
/** Local composition; parent must supply verified clinic timezone and authority. */
function Form({ clinicId, doctorUserId, timeZone, canWrite = false, send }: Props) {
  const [startsAt, setStart] = useState(""),
    [endsAt, setEnd] = useState("");
  const [state, setState] = useState("ready"),
    [message, setMessage] = useState("");
  const proposal = useRef<Proposal | null>(null),
    pending = useRef(false),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function submit() {
    if (!canWrite || !timeZone || pending.current || state === "confirmed" || state === "conflict")
      return;
    if (!proposal.current) {
      try {
        proposal.current = availabilityProposalSchema.parse({
          sourceRequestId: crypto.randomUUID(),
          interval: {
            startsAt: clinicTimeToInstant(startsAt, timeZone),
            endsAt: clinicTimeToInstant(endsAt, timeZone),
          },
        });
      } catch (error) {
        setMessage(
          error instanceof Error && !("issues" in error)
            ? error.message
            : "Confira início e término do intervalo.",
        );
        return;
      }
    }
    const input = proposal.current;
    pending.current = true;
    setState("sending");
    setMessage("Confirmando disponibilidade…");
    try {
      const receipt = availabilityReceiptSchema.parse(await send(input));
      if (!active.current) return;
      if (
        receipt.clinicId !== clinicId ||
        receipt.doctorUserId !== doctorUserId ||
        receipt.sourceRequestId !== input.sourceRequestId ||
        Date.parse(receipt.interval.startsAt) !== Date.parse(input.interval.startsAt) ||
        Date.parse(receipt.interval.endsAt) !== Date.parse(input.interval.endsAt)
      )
        throw new Error("Unexpected receipt");
      setState("confirmed");
      setMessage("Disponibilidade confirmada. Nenhuma consulta foi agendada.");
    } catch (error) {
      if (active.current) {
        const conflict = error instanceof AvailabilityConflict;
        setState(conflict ? "conflict" : "uncertain");
        setMessage(
          conflict
            ? "Há um conflito. Recarregue sua disponibilidade antes de propor outro horário."
            : "Não foi possível confirmar. Você pode reenviar o mesmo intervalo.",
        );
      }
    } finally {
      pending.current = false;
    }
  }
  const locked = !canWrite || !timeZone || state !== "ready";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilizar horário</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {timeZone
            ? `Horários no fuso da clínica: ${timeZone}`
            : "Configure o fuso da clínica antes de continuar."}{" "}
          Este intervalo não reserva uma consulta.
        </p>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="block space-y-2">
            <span>Início</span>
            <input
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
              type="datetime-local"
              required
              value={startsAt}
              disabled={locked}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span>Término</span>
            <input
              className="w-full rounded-lg border border-input bg-background px-3 py-2"
              type="datetime-local"
              required
              value={endsAt}
              disabled={locked}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
          <p role="status" aria-live="polite">
            {message}
          </p>
          {canWrite && timeZone ? (
            <Button
              type="submit"
              disabled={state === "sending" || state === "confirmed" || state === "conflict"}
            >
              {state === "uncertain" ? "Reenviar mesmo intervalo" : "Salvar disponibilidade"}
            </Button>
          ) : (
            <p>Gravação indisponível neste contexto.</p>
          )}
          {canWrite && state === "confirmed" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (pending.current) return;
                proposal.current = null;
                setStart("");
                setEnd("");
                setState("ready");
                setMessage("");
              }}
            >
              Adicionar outro intervalo
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
