import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, LogOut, ShieldCheck } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/platform/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const unavailable =
  "Serviço de autenticação temporariamente indisponível. Tente novamente mais tarde.";
const loginError =
  "Não foi possível entrar. Confira suas credenciais ou tente novamente mais tarde.";
const validationError = "Não foi possível confirmar a sessão no servidor. Tente entrar novamente.";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [validating, setValidating] = useState(true);
  const [sessionPresent, setSessionPresent] = useState(false);
  const [ready, setReady] = useState(false);
  const auth = useRef<SupabaseClient["auth"] | null>(null);
  const mounted = useRef(false);
  const revision = useRef(0);
  const operation = useRef<"login" | "logout" | null>(null);
  const abort = useRef<AbortController | null>(null);

  function invalidate() {
    revision.current += 1;
    abort.current?.abort();
    return revision.current;
  }

  async function validate(token: string) {
    const current = invalidate();
    const controller = new AbortController();
    abort.current = controller;
    setAuthenticated(false);
    setSessionPresent(true);
    setValidating(true);
    setError(null);
    const isCurrent = () =>
      mounted.current && revision.current === current && !controller.signal.aborted;
    try {
      const response = await fetch("/api/access-check", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      const body: unknown = response.status === 200 ? await response.json() : null;
      if (!isCurrent()) return;
      if (body && typeof body === "object" && "status" in body && body.status === "ok") {
        setAuthenticated(true);
        setPassword("");
        setShowPassword(false);
      } else {
        setError(validationError);
      }
    } catch {
      if (isCurrent()) setError(validationError);
    } finally {
      if (isCurrent()) setValidating(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    let unsubscribe: (() => void) | undefined;
    // SDK initialization happens only after hydration, with configuration failures contained.
    try {
      if (
        !import.meta.env["VITE_SUPABASE_URL"] ||
        !import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
        import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"].startsWith("sb_secret_")
      ) {
        throw new Error("Unavailable configuration");
      }
      auth.current = supabase.auth;
      setReady(true);
      const initialRevision = revision.current;
      const { data } = auth.current.onAuthStateChange((event, session) => {
        if (!mounted.current || operation.current === "logout") return;
        if (event === "SIGNED_OUT" || !session) {
          invalidate();
          setAuthenticated(false);
          setSessionPresent(false);
          setValidating(false);
          setPassword("");
          setShowPassword(false);
        } else {
          // No awaited SDK operation inside the synchronous auth callback.
          void validate(session.access_token);
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void auth.current
        .getSession()
        .then(({ data: restored, error: restoreError }) => {
          if (!mounted.current || revision.current !== initialRevision) return;
          if (restoreError) {
            setError(unavailable);
            setValidating(false);
          } else if (restored.session) {
            void validate(restored.session.access_token);
          } else {
            setValidating(false);
          }
        })
        .catch(() => {
          if (mounted.current && revision.current === initialRevision) {
            setError(unavailable);
            setValidating(false);
          }
        });
    } catch {
      setReady(false);
      setError(unavailable);
      setValidating(false);
    }
    return () => {
      mounted.current = false;
      invalidate();
      unsubscribe?.();
      auth.current = null;
    };
    // This subscription owns its lifecycle; callbacks read mutable request refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (!auth.current || operation.current || validating) return;
    operation.current = "login";
    const current = invalidate();
    setBusy(true);
    setError(null);
    try {
      const { data, error: signInError } = await auth.current.signInWithPassword({
        email,
        password,
      });
      if (!mounted.current || revision.current !== current) return;
      if (signInError || !data.session) setError(loginError);
      else await validate(data.session.access_token);
    } catch {
      if (mounted.current && revision.current === current) setError(loginError);
    } finally {
      operation.current = null;
      if (mounted.current) setBusy(false);
    }
  }

  async function handleLogout() {
    if (!auth.current || operation.current) return;
    operation.current = "logout";
    invalidate();
    setBusy(true);
    setAuthenticated(false);
    setValidating(false);
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setError(null);
    try {
      const { error: signOutError } = await auth.current.signOut({ scope: "local" });
      if (!mounted.current) return;
      if (signOutError) setError("Não foi possível encerrar a sessão. Tente sair novamente.");
      else setSessionPresent(false);
    } catch {
      if (mounted.current) setError("Não foi possível encerrar a sessão. Tente sair novamente.");
    } finally {
      operation.current = null;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title" aria-busy={busy || validating}>
        <Brand />
        <div className="login-heading">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Acesso à sua conta
          </span>
          <h1 id="login-title" className="mt-3 text-2xl font-semibold tracking-tight">
            {authenticated ? "Conta autenticada" : "Bem-vindo à Techmedicina"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {authenticated
              ? "Identidade confirmada no servidor."
              : "Entre com sua conta cadastrada na plataforma."}
          </p>
        </div>
        {validating ? (
          <div role="status" className="flex items-center gap-3 py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            Confirmando sessão no servidor…
          </div>
        ) : authenticated ? (
          <div className="rounded-xl border border-border bg-primary/5 p-5" role="status">
            <ShieldCheck className="mb-3 h-7 w-7 text-primary" aria-hidden="true" />
            <h2 className="font-semibold">Acesso aguardando vínculo autorizado</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua conta ainda não possui acesso autorizado a uma clínica. Dados de pacientes
              permanecem indisponíveis.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                disabled={!ready || busy}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@exemplo.com"
                className="login-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  disabled={!ready || busy}
                  onChange={(event) => setPassword(event.target.value)}
                  className="login-input pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1"
                  disabled={!ready || busy}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((shown) => !shown)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={!ready || busy} className="h-11 w-full">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Entrar
            </Button>
          </form>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {sessionPresent && (
          <Button onClick={handleLogout} disabled={busy} variant="outline" className="mt-4 w-full">
            <LogOut size={16} className="mr-2" aria-hidden="true" />
            Sair desta sessão
          </Button>
        )}
        <div className="login-demo-note">
          <p>A demonstração utiliza dados fictícios e não concede acesso a pacientes.</p>
          <Button asChild variant="ghost" className="mt-2">
            <Link to="/">Explorar demonstração</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
