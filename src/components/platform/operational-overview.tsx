import { Building2, Users } from "lucide-react";
import { useDemoClinic } from "@/features/demo/context";
export function OperationalOverview({ local = false }: { local?: boolean }) {
  const { clinics, clinic } = useDemoClinic();
  const items = local ? [clinic] : clinics;
  const total = items.reduce((sum, item) => sum + item.enabledLives, 0);
  const active = items.filter((item) => item.status === "Ativa").length;
  const max = Math.max(1, ...items.map((item) => item.enabledLives));
  return (
    <section className="operational-overview" aria-label="Indicadores operacionais demonstrativos">
      <article className="module-panel operational-distribution">
        <div className="health-panel-heading">
          <div>
            <h2>
              <Users size={17} /> Vidas habilitadas
            </h2>
            <p>Base administrativa fictícia · sem informações clínicas</p>
          </div>
          <span className="health-period">DEMO</span>
        </div>
        <div className="operational-bars">
          {items.map((item, index) => (
            <div key={item.id}>
              <div>
                <span>{item.name}</span>
                <strong>{item.enabledLives.toLocaleString("pt-BR")}</strong>
              </div>
              <div className="operational-track">
                <span
                  style={{
                    width: `${(item.enabledLives / max) * 100}%`,
                    background: index % 2 ? "var(--chart-violet)" : "var(--chart-cyan)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="health-detail">
          Total demonstrativo: {total.toLocaleString("pt-BR")} vidas habilitadas.
        </p>
      </article>
      <article className="module-panel operational-network">
        <div className="health-panel-heading">
          <div>
            <h2>
              <Building2 size={17} /> {local ? "Sua operação" : "Visão da rede"}
            </h2>
            <p>Cadastro demonstrativo de clínicas</p>
          </div>
          <span className="health-period">DEMO</span>
        </div>
        <div className="operational-network-body">
          <div
            className="operational-ring"
            style={{
              background: `conic-gradient(var(--chart-green) ${(active / items.length) * 100}%, var(--chart-violet) 0)`,
            }}
          >
            <div>
              <strong>{items.length}</strong>
              <span>{local ? "clínica" : "clínicas"}</span>
            </div>
          </div>
          <div className="operational-legend">
            <span>
              <i className="operational-dot active" />
              {active} {active === 1 ? "ativa" : "ativas"}
            </span>
            <span>
              <i className="operational-dot pending" />
              {items.length - active} em implantação
            </span>
            <p>
              Operação demonstrativa
              <br />
              sem faturamento vinculado
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
