import { useEffect, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AccountButton() {
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active) setSignedIn(Boolean(data.user));
      })
      .catch(() => {
        if (active) setSignedIn(false);
      });
    return () => {
      active = false;
    };
  }, [router.state.location.href]);
  async function signOut() {
    setBusy(true);
    setError(false);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      const result = await supabase.auth.signOut({ scope: "local" });
      if (result.error) {
        setError(true);
        return;
      }
      await navigate({ to: "/login", replace: true });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link to="/login">
          <UserRound size={16} />
          {signedIn ? "Minha conta" : "Entrar"}
        </Link>
      </Button>
      {signedIn && (
        <Button
          variant="ghost"
          size="icon"
          disabled={busy}
          onClick={signOut}
          aria-label="Sair da conta"
          title="Sair da conta"
        >
          <LogOut size={16} />
        </Button>
      )}
      {error && (
        <span role="alert" className="text-xs text-destructive">
          Não foi possível sair. Tente novamente.
        </span>
      )}
    </div>
  );
}
