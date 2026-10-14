import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MyShields } from "./my-shields";
import { createOwnShieldClient } from "./shield-client";

type Props = {
  clinicId: string;
  patientId: string;
  canRead?: boolean;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
};
/** Parent supplies verified scope; unmounted until operational host/Auth is ready. */
export function MyShieldsConnected(props: Props) {
  return (
    <Connected key={`${props.clinicId}:${props.patientId}:${Boolean(props.canRead)}`} {...props} />
  );
}
function Connected({ clinicId, patientId, canRead = false, getAccessToken, fetcher }: Props) {
  const read = useMemo(
    () => createOwnShieldClient({ clinicId, patientId, getAccessToken }, fetcher),
    [clinicId, patientId, getAccessToken, fetcher],
  );
  const [result, setResult] = useState<{ reader: typeof read; data: unknown } | null>(null);
  const [state, setState] = useState("loading");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    if (!canRead) return;
    setResult(null);
    setState("loading");
    void read()
      .then((data) => {
        if (active) {
          setResult({ reader: read, data });
          setState("ready");
        }
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [read, canRead, revision]);
  return (
    <>
      <p role="status" className="px-4 pt-4 text-sm text-muted-foreground">
        {!canRead
          ? "Consulta indisponível neste contexto."
          : state === "loading"
            ? "Carregando seus Escudos…"
            : state === "error"
              ? "Não foi possível carregar seus Escudos."
              : "Acompanhamento carregado."}
      </p>
      {canRead && state === "error" && (
        <Button className="ml-4 mt-3" onClick={() => setRevision((value) => value + 1)}>
          Tentar novamente
        </Button>
      )}
      <MyShields
        clinicId={clinicId}
        patientId={patientId}
        overview={canRead && result?.reader === read ? result.data : undefined}
      />
    </>
  );
}
