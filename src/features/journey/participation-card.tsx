import { useCallback, useEffect, useRef, useState } from "react";
import {
  journeyParticipationSchema,
  JourneyParticipationConflict,
  type JourneyParticipation,
} from "./participation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Props = {
  clinicId: string;
  patientId: string;
  read: () => Promise<unknown>;
  save: (input: {
    patientId: string;
    isEnabled: boolean;
    expectedRevision: number;
  }) => Promise<unknown>;
};

// A fresh component per clinic/patient prevents late responses from changing another patient's view.
export function JourneyParticipationCard(props: Props) {
  return <ParticipationCard key={`${props.clinicId}:${props.patientId}`} {...props} />;
}

function ParticipationCard({ clinicId, patientId, read, save }: Props) {
  const [confirmed, setConfirmed] = useState<JourneyParticipation | null>(null);
  const [draft, setDraft] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [conflict, setConflict] = useState(false);
  const generation = useRef(0);
  const validate = useCallback(
    (raw: unknown) => {
      const value = journeyParticipationSchema.parse(raw);
      if (value.clinicId !== clinicId || value.patientId !== patientId)
        throw new Error("Unexpected patient");
      return value;
    },
    [clinicId, patientId],
  );
  useEffect(() => {
    const current = ++generation.current;
    let active = true;
    setBusy(true);
    setConfirmed(null);
    setMessage("");
    setConflict(false);
    read()
      .then((raw) => {
        if (!active) return;
        const value = validate(raw);
        setConfirmed(value);
        setDraft(value.isEnabled);
      })
      .catch(() => {
        if (active) setMessage("Não foi possível carregar sua participação. Tente novamente.");
      })
      .finally(() => {
        if (active && generation.current === current) setBusy(false);
      });
    return () => {
      active = false;
      generation.current = current + 1;
    };
  }, [read, reload, validate]);

  async function submit() {
    if (!confirmed || busy || conflict || draft === confirmed.isEnabled) return;
    const current = generation.current;
    const expected = confirmed;
    const requested = draft;
    setBusy(true);
    setMessage("");
    try {
      const raw = await save({
        patientId,
        isEnabled: requested,
        expectedRevision: expected.revision,
      });
      if (generation.current !== current) return;
      const value = validate(raw);
      if (value.revision !== expected.revision + 1 || value.isEnabled !== requested)
        throw new Error("Unconfirmed preference change");
      setConfirmed(value);
      setDraft(value.isEnabled);
      setMessage(
        value.isEnabled
          ? "Participação ativada."
          : "Participação pausada. Seu histórico foi preservado.",
      );
    } catch (error) {
      if (generation.current !== current) return;
      // An uncertain write may already have committed. Reload before another change.
      setConflict(true);
      if (error instanceof JourneyParticipationConflict) {
        setMessage("Sua participação mudou em outra sessão. Recarregue antes de salvar.");
      } else {
        setMessage(
          "Não foi possível confirmar a alteração. Recarregue para verificar sua participação.",
        );
      }
    } finally {
      if (generation.current === current) setBusy(false);
    }
  }

  return (
    <Card aria-busy={busy}>
      <CardHeader>
        <CardTitle>Minha participação na Jornada</CardTitle>
        <CardDescription>
          Escolha participar ou pausar a Jornada. Seu histórico permanece disponível; essa escolha
          não altera seu tratamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {busy && !confirmed ? <p role="status">Carregando participação…</p> : null}
        {confirmed ? (
          <>
            <p className="text-sm text-muted-foreground">
              Estado confirmado: {confirmed.isEnabled ? "participando" : "pausado"}
            </p>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor={`journey-participation-${patientId}`}>Participar da Jornada</label>
              <Switch
                id={`journey-participation-${patientId}`}
                checked={draft}
                onCheckedChange={setDraft}
                disabled={busy || conflict}
              />
            </div>
            <Button onClick={submit} disabled={busy || conflict || draft === confirmed.isEnabled}>
              {busy ? "Salvando…" : "Salvar participação"}
            </Button>
          </>
        ) : null}
        {message ? (
          <p role="status" aria-live="polite" className="text-sm">
            {message}
          </p>
        ) : null}
        {message && !busy ? (
          <Button variant="outline" onClick={() => setReload((value) => value + 1)}>
            Recarregar participação
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
