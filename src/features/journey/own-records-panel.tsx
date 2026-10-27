import { useCallback, useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OwnHabitForms } from "./own-habit-forms";
import { JourneyParticipationConnectedCard } from "./participation-connected-card";
import { createOwnGoalsClient } from "./own-goals-client";
import { createOwnSelfReportHistoryClient } from "./self-report-history-client";
import type { ownGoalsPageSchema } from "./own-goals";
import type { selfReportHistoryPageSchema } from "./self-report-history";
type Goals = z.infer<typeof ownGoalsPageSchema>;
type History = z.infer<typeof selfReportHistoryPageSchema>;
type Props = {
  clinicId: string;
  patientId: string;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
};
const kinds = {
  hydration: "Hidratação",
  nutrition: "Alimentação",
  sleep: "Sono",
  emotion: "Emoções",
  medication: "Medicação",
  activity: "Atividade física",
  check_in: "Acompanhamento",
  protocol: "Protocolo",
};
const statuses = { eligible: "Elegível", paused: "Pausada", not_applicable: "Não aplicável" };
/** Read-only persisted data. Scope comes from the verified own-context endpoint. */
export function OwnJourneyRecordsPanel(props: Props) {
  return <RecordsPanel key={`${props.clinicId}:${props.patientId}`} {...props} />;
}
function RecordsPanel({ clinicId, patientId, getAccessToken, fetcher }: Props) {
  const [goals, setGoals] = useState<Goals>();
  const [history, setHistory] = useState<History>();
  const [error, setError] = useState(false),
    [busy, setBusy] = useState(true),
    [reload, setReload] = useState(0);
  const historyVersion = useRef(0);
  const scopeAbort = useRef<AbortController | null>(null),
    pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    scopeAbort.current = controller;
    historyVersion.current++;
    setGoals(undefined);
    setHistory(undefined);
    setError(false);
    setBusy(true);
    pending.current = true;
    const scope = { clinicId, patientId, getAccessToken };
    void Promise.all([
      createOwnGoalsClient(scope, fetcher)(),
      createOwnSelfReportHistoryClient(scope, fetcher)(),
    ])
      .then(([g, h]) => {
        if (!controller.signal.aborted) {
          setGoals(g);
          setHistory(h);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setBusy(false);
          pending.current = false;
        }
      });
    return () => {
      controller.abort();
    };
  }, [clinicId, patientId, getAccessToken, fetcher, reload]);
  const refreshHistory = useCallback(() => {
    const controller = scopeAbort.current;
    if (!controller || controller.signal.aborted) return;
    const version = ++historyVersion.current;
    void createOwnSelfReportHistoryClient({ clinicId, patientId, getAccessToken }, fetcher)()
      .then((page) => {
        if (!controller.signal.aborted && version === historyVersion.current) setHistory(page);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
  }, [clinicId, patientId, getAccessToken, fetcher]);
  async function more(target: "goals" | "history") {
    if (pending.current) return;
    const controller = scopeAbort.current;
    if (!controller || controller.signal.aborted) return;
    const scope = { clinicId, patientId, getAccessToken };
    const version = historyVersion.current;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      if (target === "goals" && goals?.nextCursor) {
        const page = await createOwnGoalsClient(scope, fetcher)({ after: goals.nextCursor });
        if (!controller.signal.aborted)
          setGoals({ ...page, goals: [...goals.goals, ...page.goals] });
      }
      if (target === "history" && history?.nextCursor) {
        const page = await createOwnSelfReportHistoryClient(
          scope,
          fetcher,
        )({ before: history.nextCursor });
        if (!controller.signal.aborted && version === historyVersion.current)
          setHistory({ ...page, events: [...history.events, ...page.events] });
      }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        pending.current = false;
      }
    }
  }
  return (
    <section aria-label="Seus registros da Jornada" className="space-y-4 mt-6" aria-busy={busy}>
      <JourneyParticipationConnectedCard
        clinicId={clinicId}
        patientId={patientId}
        getAccessToken={getAccessToken}
        fetcher={fetcher}
      />
      <Card>
        <CardHeader>
          <CardTitle>Suas metas e registros</CardTitle>
          <CardDescription>
            Informações do seu acompanhamento. A leitura de uma meta não autoriza seu registro nem
            altera sua VITALIDADE.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {busy && <p role="status">Carregando seus registros…</p>}
          {error && (
            <div role="alert">
              <p>Não foi possível atualizar seus registros.</p>
              <Button variant="outline" disabled={busy} onClick={() => setReload((v) => v + 1)}>
                Tentar novamente
              </Button>
            </div>
          )}
          {goals && (
            <div>
              <h3 className="font-semibold mb-3">Metas do acompanhamento</h3>
              {goals.goals.length === 0 ? (
                <p>Nenhuma meta disponível.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {goals.goals.map((g) => (
                    <li key={g.id} className="rounded-xl border border-border bg-card/60 p-4">
                      <span className="font-medium">{kinds[g.kind]}</span>
                      <p className="text-sm text-muted-foreground">
                        {statuses[g.status]} · {g.cadence === "daily" ? "Diária" : "Semanal"}
                      </p>
                      {(g.kind === "medication" || g.kind === "protocol") && (
                        <p className="text-sm text-muted-foreground">
                          Siga a orientação da sua equipe clínica.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {goals.nextCursor && (
                <Button variant="outline" disabled={busy} onClick={() => void more("goals")}>
                  Ver mais metas
                </Button>
              )}
            </div>
          )}
          {goals && (
            <OwnHabitForms
              clinicId={clinicId}
              patientId={patientId}
              getAccessToken={getAccessToken}
              fetcher={fetcher}
              goals={goals.goals}
              onConfirmed={refreshHistory}
            />
          )}
          {history && (
            <div>
              <h3 className="font-semibold mb-3">Autorrelatos confirmados</h3>
              {history.events.length === 0 ? (
                <p>Nenhum autorrelato confirmado.</p>
              ) : (
                <ul className="space-y-2">
                  {history.events.map((e) => (
                    <li key={e.id} className="rounded-xl border border-border bg-card/60 p-3">
                      <p>Atividade registrada</p>
                      <time dateTime={e.occurredAt} className="text-sm text-muted-foreground">
                        {new Date(e.occurredAt).toLocaleString("pt-BR")}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
              {history.nextCursor && (
                <Button variant="outline" disabled={busy} onClick={() => void more("history")}>
                  Ver mais registros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
