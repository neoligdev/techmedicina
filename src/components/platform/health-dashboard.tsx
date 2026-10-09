import { useId, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  HeartPulse,
  Moon,
  Scale,
  Footprints,
  Droplets,
  Watch,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useDemoClinic } from "@/features/demo/context";
import {
  activityHistory,
  bodyHistory,
  braceletReading,
  latestBody,
  bodyEstimates,
  oxygenHistory,
  heartHistory,
  demoProfile,
  bmi,
  formatNumber,
  formatReadingTime,
  shortDate,
} from "@/features/demo/health-data";

type View = "overview" | "body" | "bracelet";
function Metric({
  label,
  value,
  unit,
  icon,
  tone,
  detail,
}: {
  label: string;
  value: string;
  unit: string;
  icon: ReactNode;
  tone: string;
  detail: string;
}) {
  return (
    <article className="health-metric" data-tone={tone}>
      <div className="health-metric-top">
        <span>{label}</span>
        <span className="health-icon">{icon}</span>
      </div>
      <p className="health-value">
        {value}
        <span>{unit}</span>
      </p>
      <p className="health-detail">{detail}</p>
    </article>
  );
}
function ChartPanel({
  title,
  caption,
  children,
  table,
}: {
  title: string;
  caption: string;
  children: ReactNode;
  table: ReactNode;
}) {
  const titleId = useId();
  return (
    <section className="health-chart-panel" aria-labelledby={titleId}>
      <div className="health-panel-heading">
        <div>
          <h2 id={titleId}>{title}</h2>
          <p>{caption}</p>
        </div>
        <span className="health-period">DEMO</span>
      </div>
      <div className="health-chart" aria-hidden="true">
        {children}
      </div>
      <details className="health-data-table">
        <summary>Ver valores em tabela</summary>
        {table}
      </details>
    </section>
  );
}
const tooltipStyle = {
  background: "var(--popover)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
  borderRadius: 12,
};
const axis = { fill: "var(--muted-foreground)", fontSize: 11 };
export function HealthDashboard({
  clinician = false,
  initialView = "overview",
}: {
  clinician?: boolean;
  initialView?: View;
}) {
  const { clinic } = useDemoClinic();
  const [period, setPeriod] = useState<"all" | "recent">("all");
  const gradientId = useId().replace(/:/g, "");
  const readings = period === "recent" ? bodyHistory.slice(-4) : bodyHistory;
  const body = readings.map((r) => ({ ...r, date: shortDate(r.at) }));
  const showBody = initialView !== "bracelet";
  const showBracelet = initialView !== "body";
  const bodyTitle =
    initialView === "body"
      ? "Seu corpo, em perspectiva"
      : initialView === "bracelet"
        ? "Movimento e descanso"
        : clinician
          ? "Visão integrada do paciente"
          : "Seu dia, em perspectiva";
  return (
    <div className="page-content health-dashboard">
      <header className="health-heading">
        <div>
          <span className="eyebrow">
            {clinician ? "ACOMPANHAMENTO MÉDICO · DEMONSTRAÇÃO" : "SEU ESPAÇO DE CUIDADO"}
          </span>
          <h1>
            {bodyTitle}
            <span className="heading-dot">.</span>
          </h1>
          <p>
            {demoProfile.name} · {clinic.name}
          </p>
        </div>
        <span className="health-profile-badge">
          <Activity size={16} /> Histórico demonstrativo
        </span>
      </header>
      <div className="health-demo-note">
        <Watch size={18} />
        <div>
          <strong>Dados demonstrativos — sem conexão com dispositivos.</strong>
          <p>
            Valores fictícios para explorar a interface. Os indicadores disponíveis na H59/H59MAX e
            na balança dependem de validação do fabricante.
          </p>
        </div>
      </div>
      <nav className="health-view-links" aria-label="Visões de saúde">
        <Link
          to={clinician ? "/medico/$section" : "/app"}
          {...(clinician ? { params: { section: "pacientes" } } : {})}
          className={initialView === "overview" ? "is-selected" : ""}
        >
          Visão geral
        </Link>
        {!clinician && (
          <>
            <Link
              to="/app/$section"
              params={{ section: "bioimpedancia" }}
              className={initialView === "body" ? "is-selected" : ""}
            >
              Bioimpedância
            </Link>
            <Link
              to="/app/$section"
              params={{ section: "saude" }}
              className={initialView === "bracelet" ? "is-selected" : ""}
            >
              Pulseira e atividade
            </Link>
          </>
        )}
        {clinician && (
          <span className="health-shared-note">Mesma fonte de dados do aplicativo do paciente</span>
        )}
      </nav>
      {showBody && (
        <>
          <div className="health-section-label">
            <div>
              <Scale size={18} />
              <h2>Composição corporal</h2>
            </div>
            <span>Balança demonstrativa · {formatReadingTime(latestBody.at)}</span>
          </div>
          <div className="health-metrics">
            <Metric
              label="Peso"
              value={formatNumber(latestBody.weight)}
              unit="kg"
              icon={<Scale size={20} />}
              tone="cyan"
              detail="Medição fictícia da balança"
            />
            <Metric
              label="Gordura corporal"
              value={formatNumber(latestBody.fat)}
              unit="%"
              icon={<Activity size={20} />}
              tone="violet"
              detail="Estimativa demonstrativa"
            />
            <Metric
              label="Massa muscular"
              value={formatNumber(latestBody.muscle)}
              unit="kg"
              icon={<Activity size={20} />}
              tone="pink"
              detail="Estimativa demonstrativa"
            />
            <Metric
              label="Água corporal"
              value={formatNumber(latestBody.water)}
              unit="%"
              icon={<Droplets size={20} />}
              tone="green"
              detail="Estimativa demonstrativa"
            />
          </div>
          <div className="health-mini-metrics">
            <span>
              IMC calculado <strong>{formatNumber(bmi)}</strong>
            </span>
            <span>
              Altura do perfil fictício <strong>1,75 m</strong>
            </span>
            <span>
              Massa óssea estimada <strong>{formatNumber(bodyEstimates.bone)} kg</strong>
            </span>
            <span>
              Metabolismo basal estimado{" "}
              <strong>{formatNumber(bodyEstimates.basalEnergy, 0)} kcal/dia</strong>
            </span>
            <span>
              Índice estimado de gordura visceral <strong>{bodyEstimates.visceralFatIndex}</strong>
            </span>
          </div>
          <div className="health-filter">
            <span>Evolução da composição</span>
            <label>
              Período
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value === "recent" ? "recent" : "all")}
              >
                <option value="all">8 medições · 18/09 a 09/10</option>
                <option value="recent">4 últimas medições</option>
              </select>
            </label>
          </div>
          <div className="health-chart-grid">
            <ChartPanel
              title="Evolução do peso"
              caption="kg · balança demonstrativa"
              table={
                <table>
                  <caption>Peso por data</caption>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Peso (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((r) => (
                      <tr key={r.at}>
                        <td>{formatReadingTime(r.at)}</td>
                        <td>{formatNumber(r.weight)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={body} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`${gradientId}-weight`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-cyan)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-cyan)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 6" />
                  <XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 90]}
                    tick={axis}
                    width={34}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${formatNumber(v)} kg`, "Peso"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--chart-cyan)"
                    strokeWidth={3}
                    fill={`url(#${gradientId}-weight)`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel
              title="Gordura corporal"
              caption="% · estimativa demonstrativa"
              table={
                <table>
                  <caption>Gordura corporal e massa muscular por data</caption>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Gordura (%)</th>
                      <th>Músculo (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((r) => (
                      <tr key={r.at}>
                        <td>{shortDate(r.at)}</td>
                        <td>{formatNumber(r.fat)}</td>
                        <td>{formatNumber(r.muscle)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={body} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 6" />
                  <XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 35]}
                    tick={axis}
                    width={34}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${formatNumber(v)} %`, "Gordura"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="fat"
                    stroke="var(--chart-violet)"
                    strokeWidth={3}
                    fill="var(--chart-violet)"
                    fillOpacity={0.15}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel
              title="Massa muscular"
              caption="kg · estimativa demonstrativa"
              table={
                <table>
                  <caption>Massa muscular por data</caption>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Massa muscular (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((r) => (
                      <tr key={r.at}>
                        <td>{shortDate(r.at)}</td>
                        <td>{formatNumber(r.muscle)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={body} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 6" />
                  <XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 40]}
                    tick={axis}
                    width={34}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${formatNumber(v)} kg`, "Massa muscular"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="muscle"
                    stroke="var(--chart-pink)"
                    strokeWidth={3}
                    fill="var(--chart-pink)"
                    fillOpacity={0.15}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </>
      )}
      {showBracelet && (
        <>
          <div className="health-section-label">
            <div>
              <Watch size={18} />
              <h2>Pulseira, movimento e descanso</h2>
            </div>
            <span>Pulseira demonstrativa · {formatReadingTime(braceletReading.at)}</span>
          </div>
          <div className="health-metrics">
            <Metric
              label="Frequência cardíaca"
              value={formatNumber(braceletReading.bpm, 0)}
              unit="bpm"
              icon={<HeartPulse size={20} />}
              tone="pink"
              detail="Leitura fictícia · 09/10, 18h"
            />
            <Metric
              label="Saturação de oxigênio"
              value={formatNumber(braceletReading.oxygen, 0)}
              unit="%"
              icon={<Droplets size={20} />}
              tone="cyan"
              detail="Leitura fictícia · sem avaliação clínica"
            />
            <Metric
              label="Passos"
              value={formatNumber(braceletReading.steps, 0)}
              unit="passos"
              icon={<Footprints size={20} />}
              tone="green"
              detail="Total fictício de 09/10"
            />
            <Metric
              label="Duração do sono"
              value={`${Math.floor(braceletReading.sleepMinutes / 60)}h${braceletReading.sleepMinutes % 60}`}
              unit="min"
              icon={<Moon size={20} />}
              tone="violet"
              detail="Histórico fictício · noite anterior"
            />
          </div>
          <div className="health-mini-metrics">
            <span>
              Distância estimada <strong>{formatNumber(braceletReading.distance)} km</strong>
            </span>
            <span>
              Energia de atividade estimada <strong>{braceletReading.activityEnergy} kcal</strong>
            </span>
            <span>
              Conexão com equipamento <strong>Não implementada</strong>
            </span>
          </div>
          <div className="health-chart-grid">
            <ChartPanel
              title="Ritmo ao longo do dia"
              caption="Frequência cardíaca · bpm · 09/10/2026"
              table={
                <table>
                  <caption>Frequência cardíaca por horário</caption>
                  <thead>
                    <tr>
                      <th>Horário</th>
                      <th>bpm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heartHistory.map((r) => (
                      <tr key={r.hour}>
                        <td>{r.hour}</td>
                        <td>{r.bpm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[...heartHistory]}>
                  <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 6" />
                  <XAxis dataKey="hour" tick={axis} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 120]}
                    tick={axis}
                    width={34}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${v} bpm`, "Frequência"]}
                  />
                  <Area
                    dataKey="bpm"
                    type="monotone"
                    stroke="var(--chart-pink)"
                    fill="var(--chart-pink)"
                    fillOpacity={0.12}
                    strokeWidth={3}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel
              title="Movimento da semana"
              caption="Passos · 03/10 a 09/10/2026"
              table={
                <table>
                  <caption>Passos e sono por dia</caption>
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Passos</th>
                      <th>Sono (h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityHistory.map((r) => (
                      <tr key={r.day}>
                        <td>{r.day}</td>
                        <td>{formatNumber(r.steps, 0)}</td>
                        <td>{formatNumber(r.sleep, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...activityHistory]}>
                  <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 6" />
                  <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
                  <YAxis tick={axis} width={38} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "var(--accent)" }}
                    formatter={(v: number) => [formatNumber(v, 0), "Passos"]}
                  />
                  <Bar
                    dataKey="steps"
                    fill="var(--chart-green)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel
              title="Descanso da semana"
              caption="Horas de sono · 03/10 a 09/10/2026"
              table={
                <table>
                  <caption>Duração do sono por dia</caption>
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityHistory.map((r) => (
                      <tr key={r.day}>
                        <td>{r.day}</td>
                        <td>{formatNumber(r.sleep, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...activityHistory]}>
                  <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 6" />
                  <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 10]}
                    tick={axis}
                    width={34}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "var(--accent)" }}
                    formatter={(v: number) => [`${formatNumber(v, 2)} h`, "Sono"]}
                  />
                  <Bar
                    dataKey="sleep"
                    fill="var(--chart-violet)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        </>
      )}
      {showBracelet && (
        <details className="health-history">
          <summary>Histórico demonstrativo de saturação</summary>
          <table>
            <caption>Saturação de oxigênio · leituras fictícias</caption>
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Saturação (%)</th>
              </tr>
            </thead>
            <tbody>
              {oxygenHistory.map((reading) => (
                <tr key={reading.at}>
                  <td>{formatReadingTime(reading.at)}</td>
                  <td>{reading.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      <section className="health-context">
        <div>
          <span className="health-icon">
            <Activity size={24} />
          </span>
          <h2>Contexto antes de conclusões</h2>
          <p>
            Este painel não classifica resultados nem gera diagnósticos. As estimativas de
            composição dependem do equipamento e do perfil. Os dados fictícios não foram
            sincronizados e não representam um acompanhamento real.
          </p>
        </div>
        <Link
          to={clinician ? "/medico/$section" : "/app/$section"}
          params={{ section: clinician ? "consultas" : "protocolos" }}
          className="health-context-link"
        >
          {clinician ? "Explorar consultas" : "Explorar meus protocolos"}
          <ArrowUpRight size={18} />
        </Link>
      </section>
    </div>
  );
}
