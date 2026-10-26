import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDemoClinic } from "@/features/demo/context";
import { shouldEnablePatientDemo } from "@/features/demo/demo-authorization";
import { MyShields } from "./my-shields";
import { createOwnShieldClient } from "./shield-client";

/**
 * Seção de Meus Escudos conectada ao contexto de clínica e autenticação do cliente.
 * Suporta consumo de dados reais autenticados com tratamento dos estados:
 * - loading
 * - error
 * - ready (com tratamento de insuficiência de avaliações, provisório e oficial)
 * Garante que em produção a ausência de sessão não habilite simulações fictícias.
 */
export function AppShieldsSection() {
  const { clinic } = useDemoClinic();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [patientId, setPatientId] = useState<string | undefined>();
  const [shieldOverview, setShieldOverview] = useState<unknown | undefined>(undefined);
  const [shieldStatus, setShieldStatus] = useState<"loading" | "error" | "ready" | undefined>(
    undefined,
  );

  const isDemo = shouldEnablePatientDemo(hasSession);

  const fetchRealShields = useCallback(async (pId: string, cId: string) => {
    setShieldStatus("loading");
    try {
      const client = createOwnShieldClient({
        clinicId: cId,
        patientId: pId,
        getAccessToken: async () => {
          const { data } = await supabase.auth.getSession();
          return data?.session?.access_token ?? null;
        },
      });
      const overview = await client();
      setShieldOverview(overview);
      setShieldStatus("ready");
    } catch {
      // Backend ainda não montado ou indisponível
      setShieldOverview(undefined);
      setShieldStatus("error");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.user) {
          setHasSession(true);
          setPatientId(data.user.id);
          void fetchRealShields(data.user.id, clinic.id);
        } else {
          setHasSession(false);
          setPatientId(undefined);
          setShieldOverview(undefined);
          setShieldStatus(undefined);
        }
      })
      .catch(() => {
        if (mounted) {
          setHasSession(false);
          setPatientId(undefined);
          setShieldOverview(undefined);
          setShieldStatus(undefined);
        }
      });

    return () => {
      mounted = false;
    };
  }, [clinic.id, fetchRealShields]);

  return (
    <MyShields
      isDemo={isDemo}
      clinicId={clinic.id}
      patientId={patientId}
      overview={shieldOverview}
      status={isDemo ? undefined : shieldStatus}
      onRetry={() => {
        if (patientId) {
          void fetchRealShields(patientId, clinic.id);
        }
      }}
    />
  );
}
