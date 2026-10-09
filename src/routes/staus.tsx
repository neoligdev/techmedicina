import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Clock3, CircleDashed, ArrowLeft, Search } from "lucide-react";
import {
  statusItems,
  deliveries,
  statusLabels,
  updatedAt,
  filterStatusItems,
  type StatusItem,
} from "@/features/project-status/catalog";
import { pageHead } from "@/features/demo/metadata";

export const Route = createFileRoute("/staus")({
  head: () => pageHead("Status do projeto · temporário"),
  component: ProjectStatusPage,
});
function Item({ item }: { item: StatusItem }) {
  const Icon = item.status === "pending" ? CircleDashed : Check;
  return (
    <li className="project-status-item" id={`prd-${item.id}`}>
      <div className="project-status-item-heading">
        <span
          className="project-status-symbol"
          data-status={item.status}
          aria-label={statusLabels[item.status]}
        >
          <Icon size={19} />
        </span>
        <div>
          <h3>
            {item.id} · {item.title}
          </h3>
          <span className="project-status-state" data-status={item.status}>
            {statusLabels[item.status]}
          </span>
        </div>
      </div>
      <p>
        <strong>Feito:</strong> {item.done}
      </p>
      <p>
        <strong>Em desenvolvimento / próximo passo:</strong> {item.next}
      </p>
      <p className="project-status-authors">
        <strong>Implementação entregue por:</strong>{" "}
        {item.authors.length
          ? item.authors.join(" · ")
          : "Nenhum executor — implementação funcional não iniciada."}
      </p>
      {item.requirements.length > 0 && (
        <details>
          <summary>
            Ver todos os requisitos deste item no PRD ({item.requirements.length} blocos)
          </summary>
          <ul>
            {item.requirements.map((requirement, index) => (
              <li key={index}>{requirement}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
function ProjectStatusPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const results = filterStatusItems(statusItems, query, status);
  const sections = statusItems.filter((item) => item.parent === null);
  return (
    <div className="page-content project-status-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">ACOMPANHAMENTO TEMPORÁRIO · PRD V0.10</span>
          <h1>
            Status do projeto<span className="heading-dot">.</span>
          </h1>
          <p>Entregas, requisitos e próximos passos do PlugPix Techmedicina.</p>
        </div>
        <Link to="/super-admin" className="health-context-link">
          <ArrowLeft size={16} /> Super ADM
        </Link>
      </header>
      <div className="project-status-note">
        <Clock3 size={19} />
        <div>
          <strong>Página temporária · atualização em {updatedAt}</strong>
          <p>
            Será removida, junto do botão, rota e catálogo, ao concluir o desenvolvimento. Este
            relatório é atualizado no código a cada etapa e enviado por commit; não representa
            monitoramento automático.
          </p>
          <p>
            Azul identifica requisitos iniciados ou parcialmente entregues. Pendências descritas não
            significam que há um executor trabalhando nelas neste momento. Prévia visual e dados
            fictícios não concluem requisitos de produção.
          </p>
        </div>
      </div>
      <div className="project-status-legend">
        <span data-status="done">
          <Check size={17} /> Verde: concluído no escopo descrito
        </span>
        <span data-status="progress">
          <Check size={17} /> Azul: iniciado / parcial
        </span>
        <span data-status="pending">
          <CircleDashed size={17} /> Amarelo: pendente
        </span>
      </div>
      <div className="project-status-summary">
        <article>
          <strong>{sections.length}</strong>
          <span>Seções do PRD</span>
        </article>
        <article>
          <strong>{statusItems.length - sections.length}</strong>
          <span>Subitens do PRD</span>
        </article>
        <article>
          <strong>{deliveries.length}</strong>
          <span>Entregas concluídas de demonstração/base</span>
        </article>
        <article>
          <strong>{statusItems.filter((item) => item.status === "progress").length}</strong>
          <span>Itens do PRD iniciados ou parciais</span>
        </article>
      </div>
      <section aria-labelledby="completed-heading">
        <h2 id="completed-heading">O que já foi entregue</h2>
        <p className="project-status-description">
          Checks verdes se referem às entregas abaixo, com limites explícitos. O requisito completo
          do PRD continua listado separadamente.
        </p>
        <ul className="project-status-deliveries">
          {deliveries.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </ul>
      </section>
      <section aria-labelledby="prd-heading">
        <h2 id="prd-heading">Todos os itens do PRD</h2>
        <div className="project-status-filters">
          <label>
            <span>
              <Search size={16} /> Buscar requisito, executor ou número
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: bioimpedância, Codex, 13.2"
            />
          </label>
          <label>
            <span>Situação</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Todas</option>
              <option value="done">Verde · concluído</option>
              <option value="progress">Azul · iniciado / parcial</option>
              <option value="pending">Amarelo · pendente</option>
            </select>
          </label>
        </div>
        <p role="status" className="project-status-description">
          {results.length} de {statusItems.length} itens do PRD.
        </p>
        {results.length === 0 && (
          <p className="project-status-note">
            Nenhum requisito corresponde ao filtro. As entregas verdes de demonstração estão na
            lista acima; nenhum módulo produtivo completo foi declarado concluído.
          </p>
        )}
        {sections.map((section) => {
          const members = results.filter(
            (item) => item.id === section.id || item.parent === section.id,
          );
          if (!members.length) return null;
          return (
            <section
              key={section.id}
              className="project-status-group"
              aria-label={`PRD ${section.id}: ${section.title}`}
            >
              <h2>
                {section.id} · {section.title}
              </h2>
              <ul>
                {members.map((item) => (
                  <Item key={item.id} item={item} />
                ))}
              </ul>
            </section>
          );
        })}
      </section>
    </div>
  );
}
