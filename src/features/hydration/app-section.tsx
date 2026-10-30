import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isLocalOrPreviewHost } from "@/lib/white-label/host-resolver";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadOwnHydrationHistory } from "./complete-history-client";
import { HydrationHistoryChart } from "./history-chart";
import { HydrationWritePanel } from "./write-panel";
import { HydrationSettingsPanel } from "./settings-panel";
function AuthenticatedHydrationPanel({ userId }: { userId: string }) {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return active.current && data.session?.user.id === userId ? data.session.access_token : null;
  }, [userId]);
  return <HydrationReadPanel getAccessToken={getAccessToken} />;
}
export function HydrationSection() {
  const [mode, setMode] = useState<"checking" | "demo" | "login" | "ready">("checking"),
    [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    if (isLocalOrPreviewHost(window.location.hostname)) {
      setMode("demo");
      return;
    }
    let active = true,
      version = 0;
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (active && version === 0) {
          setUserId(error ? null : (data.user?.id ?? null));
          setMode(!error && data.user ? "ready" : "login");
        }
      })
      .catch(() => {
        if (active && version === 0) setMode("login");
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        version++;
        setUserId(session?.user.id ?? null);
        setMode(session ? "ready" : "login");
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return (
    <section className="page-content">
      <Card>
        <CardHeader>
          <CardTitle>Hidratação</CardTitle>
          <CardDescription>
            Consulte a água que você registrou, sem confundir ausência de registro com ausência de
            consumo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "checking" ? (
            <p role="status">Conferindo acesso…</p>
          ) : mode === "demo" ? (
            <p>
              A consulta de registros reais requer o endereço verificado do aplicativo da sua
              clínica e acesso de paciente autorizado. Esta prévia não mostra dados de saúde.
            </p>
          ) : mode === "login" ? (
            <p>
              Entre com sua conta de paciente para consultar seu histórico.{" "}
              <a href="/login" className="underline">
                Entrar
              </a>
            </p>
          ) : (
            <AuthenticatedHydrationPanel key={userId} userId={userId ?? ""} />
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Meta e avisos nesta tela exigem acesso próprio. Avisos funcionam com a tela aberta e
            visível; notificações em segundo plano permanecem pendentes. Registros exigem permissão
            da clínica.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
export function HydrationReadPanel({
  getAccessToken,
  fetcher,
  now = () => new Date().toISOString(),
}: {
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
  now?: () => string;
}) {
  const [timeZone, setTimeZone] = useState(""),
    [period, setPeriod] = useState("day"),
    [busy, setBusy] = useState(false),
    [writeLocked, setWriteLocked] = useState(false),
    [settingsLocked, setSettingsLocked] = useState(false),
    [stale, setStale] = useState(false),
    [error, setError] = useState(false),
    [result, setResult] = useState<Awaited<ReturnType<typeof loadOwnHydrationHistory>>>();
  const scope = useRef<AbortController | null>(null),
    pending = useRef(false);
  useEffect(() => {
    const c = new AbortController();
    scope.current = c;
    pending.current = false;
    setWriteLocked(false);
    setSettingsLocked(false);
    setStale(false);
    setResult(undefined);
    setBusy(false);
    setError(false);
    return () => c.abort();
  }, [getAccessToken, fetcher]);
  async function load() {
    const c = scope.current;
    if (!c || c.signal.aborted || pending.current || writeLocked || settingsLocked || !timeZone)
      return;
    pending.current = true;
    setBusy(true);
    setError(false);
    setResult(undefined);
    try {
      const data = await loadOwnHydrationHistory(
        { period, timeZone, asOf: now() },
        { getAccessToken, ...(fetcher ? { fetcher } : {}), signal: c.signal },
      );
      if (!c.signal.aborted) {
        setResult(data);
        setStale(false);
      }
    } catch {
      if (!c.signal.aborted) setError(true);
    } finally {
      if (!c.signal.aborted) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <div className="space-y-4" aria-busy={busy}>
      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label className="space-y-2">
          <span>Período</span>
          <select
            className="block rounded-lg border border-input bg-background p-3"
            value={period}
            disabled={busy || writeLocked || settingsLocked}
            onChange={(e) => {
              setPeriod(e.target.value);
              setResult(undefined);
              setError(false);
            }}
          >
            <option value="day">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Este mês</option>
            <option value="year">Este ano</option>
          </select>
        </label>
        <label className="space-y-2">
          <span>Fuso horário da consulta</span>
          <select
            className="block rounded-lg border border-input bg-background p-3"
            value={timeZone}
            disabled={busy || writeLocked || settingsLocked}
            onChange={(e) => {
              setTimeZone(e.target.value);
              setResult(undefined);
              setError(false);
            }}
          >
            <option value="">Selecione seu fuso</option>
            <option value="America/Bahia">Bahia</option>
            <option value="America/Sao_Paulo">São Paulo</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
        <Button type="submit" disabled={busy || writeLocked || settingsLocked || !timeZone}>
          Consultar histórico
        </Button>
      </form>
      {busy && <p role="status">Carregando todo o período…</p>}
      {error && (
        <p role="alert">
          Não foi possível carregar todo o período. Confira seu acesso e tente novamente, ou escolha
          um período menor.
        </p>
      )}
      {result && (
        <>
          <p className="text-sm text-muted-foreground">
            Consulta até{" "}
            {new Date(result.window.asOf).toLocaleString("pt-BR", {
              timeZone: result.window.timeZone,
            })}
            . Os registros podem mudar; consulte novamente para atualizar.
          </p>
          {!stale && (
            <HydrationHistoryChart
              scope={result.scope}
              records={result.records}
              window={result.window}
            />
          )}
          {stale && (
            <p role="status">
              Histórico desatualizado após alteração. Consulte novamente para atualizar os gráficos.
            </p>
          )}
          <HydrationWritePanel
            scope={result.scope}
            records={result.records}
            getAccessToken={getAccessToken}
            {...(fetcher ? { fetcher } : {})}
            blocked={settingsLocked}
            onLocked={setWriteLocked}
            onChanged={() => setStale(true)}
          />
          <HydrationSettingsPanel
            scope={result.scope}
            getAccessToken={getAccessToken}
            {...(fetcher ? { fetcher } : {})}
            blocked={writeLocked}
            onLocked={setSettingsLocked}
          />
        </>
      )}
    </div>
  );
}
