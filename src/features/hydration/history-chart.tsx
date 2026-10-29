import { useMemo } from "react";
import { projectHydration } from "./history";
export function HydrationHistoryChart({
  scope,
  records,
  window,
}: {
  scope: unknown;
  records: unknown;
  window: unknown;
}) {
  const history = useMemo(() => projectHydration(scope, records, window), [scope, records, window]);
  const maximum = Math.max(0, ...history.buckets.map((b) => b.recordedMl ?? 0));
  const number = new Intl.NumberFormat("pt-BR");
  return (
    <section
      aria-label="Histórico de água registrada"
      className="space-y-4 rounded-xl border border-border bg-card/60 p-5"
    >
      <h3 className="font-semibold">Histórico de água registrada</h3>
      <p className="text-sm text-muted-foreground">
        Somente volumes registrados em mL. Ausência de registro não informa o consumo real. As
        barras comparam registros, não uma meta clínica.
      </p>
      <p>Fuso: {history.timeZone}</p>
      <p>
        {history.totalRecordedMl === null
          ? "Sem registros no período"
          : `${number.format(history.totalRecordedMl)} mL registrados no período`}
      </p>
      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label="Comparação dos volumes registrados; detalhes na tabela"
          className="flex items-end gap-3 h-40 min-w-max border-b border-border"
        >
          {history.buckets.map((bucket) => (
            <div
              key={bucket.key}
              className="flex flex-col justify-end items-center w-16 h-full gap-1"
            >
              <span className="text-xs">
                {bucket.recordedMl === null ? "—" : number.format(bucket.recordedMl)}
              </span>
              <div
                data-testid={"hydration-bar-" + bucket.key}
                className="w-8 rounded-t-md bg-primary/70"
                style={{
                  height: maximum > 0 ? `${((bucket.recordedMl ?? 0) / maximum) * 70}%` : "0%",
                }}
              />
              <span className="text-xs">{bucket.key}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="text-left">Volumes registrados por período</caption>
          <thead>
            <tr>
              <th scope="col">Período</th>
              <th scope="col">Volume registrado</th>
              <th scope="col">Registros</th>
            </tr>
          </thead>
          <tbody>
            {history.buckets.map((bucket) => (
              <tr key={bucket.key}>
                <th scope="row" className="text-left">
                  {bucket.key}
                </th>
                <td>
                  {bucket.recordedMl === null
                    ? "Sem registro"
                    : `${number.format(bucket.recordedMl)} mL`}
                </td>
                <td>{bucket.recordCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
