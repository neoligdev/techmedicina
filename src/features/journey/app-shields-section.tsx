import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDemoClinic } from "@/features/demo/context";
import {
  shouldEnablePatientDemo,
  patientSessionPresence,
} from "@/features/demo/demo-authorization";
import { MyShields } from "./my-shields";

/**
 * Seção de Meus Escudos conectada ao contexto de clínica e autenticação do cliente.
 * Garante que em produção a ausência de sessão não habilite simulações fictícias.
 */
export function AppShieldsSection() {
  const { clinic } = useDemoClinic();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [patientId, setPatientId] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!mounted) return;
        const presence = patientSessionPresence(data?.user, error);
        setHasSession(presence);
        if (presence === true && data?.user) {
          setPatientId(data.user.id);
        } else {
          setPatientId(undefined);
        }
      })
      .catch(() => {
        if (mounted) {
          setHasSession(null);
          setPatientId(undefined);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const isDemo = shouldEnablePatientDemo(hasSession);

  return <MyShields isDemo={isDemo} clinicId={clinic.id} patientId={patientId} />;
}
