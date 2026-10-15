import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clinicTimeToInstant } from "./local-time";
import { availabilityPageQuerySchema, availabilityPageSchema } from "./availability-page";
import { validateAvailabilityPage } from "./availability-read-client";
type Query = z.infer<typeof availabilityPageQuerySchema>;
type Page = z.infer<typeof availabilityPageSchema>;
type Props = {
  clinicId: string;
  doctorUserId: string;
  timeZone: string;
  canRead?: boolean;
  load: (query: Query) => Promise<unknown>;
};
export function AvailabilityList(props: Props) {
  return (
    <List
      key={`${props.clinicId}:${props.doctorUserId}:${props.timeZone}:${Boolean(props.canRead)}`}
      {...props}
    />
  );
}
function List(props: Props) {
  const [start, setStart] = useState(""),
    [end, setEnd] = useState("");
  const [page, setPage] = useState<Page | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const currentQuery = useRef<Query | null>(null),
    pending = useRef(false),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  let formatter: Intl.DateTimeFormat | undefined;
  try {
    if (props.timeZone)
      formatter = new Intl.DateTimeFormat("pt-BR", {
        timeZone: props.timeZone,
        dateStyle: "short",
        timeStyle: "short",
      });
  } catch {
    /* Fail closed on missing clinic timezone. */
  }
  async function read(more = false) {
    if (!props.canRead || !formatter || pending.current) return;
    let query: Query;
    try {
      query =
        more && currentQuery.current && page?.next
          ? { ...currentQuery.current, after: page.next }
          : availabilityPageQuerySchema.parse({
              window: {
                startsAt: clinicTimeToInstant(start, props.timeZone),
                endsAt: clinicTimeToInstant(end, props.timeZone),
              },
            });
    } catch {
      setMessage("Confira o período e o fuso da clínica.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setMessage("Consultando disponibilidade…");
    if (!more) setPage(null);
    try {
      const result = validateAvailabilityPage(await props.load(query), query, props);
      if (!active.current) return;
      const items = more ? [...(page?.items ?? []), ...result.items] : result.items;
      if (new Set(items.map((item) => item.id)).size !== items.length)
        throw new Error("Repeated availability");
      currentQuery.current = query;
      setPage({ ...result, items });
      setMessage(items.length ? "Disponibilidade consultada." : "Nenhum intervalo neste período.");
    } catch {
      if (active.current) setMessage("Não foi possível consultar os horários. Tente novamente.");
    } finally {
      if (active.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  function changed() {
    setPage(null);
    currentQuery.current = null;
    setMessage("");
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Minha disponibilidade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Fuso da clínica: {props.timeZone || "indisponível"}. Intervalos disponíveis não são
          consultas agendadas.
        </p>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void read();
          }}
        >
          <label>
            Consultar a partir de
            <input
              className="block w-full rounded-lg border border-input bg-background p-2"
              type="datetime-local"
              required
              disabled={busy || !props.canRead || !formatter}
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                changed();
              }}
            />
          </label>
          <label>
            Consultar até
            <input
              className="block w-full rounded-lg border border-input bg-background p-2"
              type="datetime-local"
              required
              disabled={busy || !props.canRead || !formatter}
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                changed();
              }}
            />
          </label>
          {props.canRead && formatter ? (
            <Button disabled={busy} type="submit">
              Consultar horários
            </Button>
          ) : (
            <p>Leitura indisponível neste contexto.</p>
          )}
        </form>
        <p role="status" aria-live="polite">
          {message}
        </p>
        <ul className="space-y-2">
          {page?.items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border bg-card/50 p-3">
              {formatter?.format(new Date(item.interval.startsAt))} —{" "}
              {formatter?.format(new Date(item.interval.endsAt))}
            </li>
          ))}
        </ul>
        {page?.next && (
          <Button variant="outline" disabled={busy} onClick={() => void read(true)}>
            Carregar mais horários
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
