import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PatientHome } from "../patient-home";

export function PacienteDashboard() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [patientName, setPatientName] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.user) {
          setHasSession(true);
          const name =
            typeof data.user.user_metadata?.full_name === "string"
              ? data.user.user_metadata.full_name
              : (data.user.email ?? undefined);
          setPatientName(name);
        } else {
          setHasSession(false);
        }
      })
      .catch(() => {
        if (mounted) setHasSession(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Se houver sessão autenticada real, isDemo é categoricamente false.
  // Somente ativa demonstração no preview se comprovadamente não houver sessão ativa.
  const isDemo = hasSession === false;

  return <PatientHome isDemo={isDemo} patientName={patientName} />;
}
