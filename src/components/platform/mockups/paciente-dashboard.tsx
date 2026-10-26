import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  shouldEnablePatientDemo,
  patientSessionPresence,
} from "@/features/demo/demo-authorization";
import { PatientHome } from "../patient-home";

export function PacienteDashboard() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [patientName, setPatientName] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!mounted) return;
        const presence = patientSessionPresence(data?.user, error);
        setHasSession(presence);
        if (presence === true && data?.user) {
          const meta = data.user.user_metadata;
          const fullName =
            meta && typeof meta["full_name"] === "string" ? meta["full_name"] : undefined;
          const name = fullName ?? data.user.email ?? undefined;
          setPatientName(name);
        } else {
          setPatientName(undefined);
        }
      })
      .catch(() => {
        if (mounted) {
          setHasSession(null);
          setPatientName(undefined);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Se houver sessão autenticada real, isDemo é categoricamente false.
  // Em produção sem sessão, isDemo é categoricamente false (não exibe simulações sem autorização).
  // Somente em desenvolvimento/preview autorizado ativa demonstração.
  const isDemo = shouldEnablePatientDemo(hasSession);

  return <PatientHome isDemo={isDemo} patientName={patientName} />;
}
