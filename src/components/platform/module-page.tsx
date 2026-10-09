import { useRef, useState } from "react";
import { ArrowRight, Check, FileText, ListFilter, Plus, Search, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { moduleSpec, type ModuleSpec } from "@/features/demo/module-catalog";
import { useDemoClinic } from "@/features/demo/context";
import type { Area } from "@/features/demo/types";

interface PreviewItem {
  id: string;
  name: string;
  detail: string;
  status: string;
}
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

export function ModulePage({ area, slug }: { area: Area; slug: string }) {
  const { clinic } = useDemoClinic();
  const spec = moduleSpec(area, slug);
  if (!spec) return null;
  return <ModuleWorkspace key={`${area}:${slug}:${clinic.id}`} spec={spec} />;
}

export function ModuleWorkspace({ spec }: { spec: ModuleSpec }) {
  const root = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<PreviewItem[]>(() =>
    spec.samples.map((name, index) => ({
      id: `example-${index}`,
      name,
      detail: "Exemplo de interface. Não corresponde a uma pessoa, contrato ou serviço real.",
      status: "Exemplo",
    })),
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<PreviewItem | null>(null);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = items.filter(
    (item) =>
      normalize(item.name + " " + item.detail).includes(normalize(query.trim())) &&
      (status === "Todos" || item.status === status),
  );
  function resetForm() {
    setName("");
    setDetail("");
    setError("");
  }
  function openForm() {
    resetForm();
    setAdding(true);
  }
  function addPreview(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 3) {
      setError("Use pelo menos 3 caracteres para identificar o exemplo.");
      return;
    }
    setItems((current) => [
      { id: `draft-${Date.now()}`, name: name.trim(), detail: detail.trim(), status: "Rascunho" },
      ...current,
    ]);
    setQuery("");
    setStatus("Todos");
    setAdding(false);
    resetForm();
    setNotice("Exemplo adicionado nesta tela. Ao sair ou recarregar, ele será descartado.");
  }
  const openDetails = (item: PreviewItem) => {
    setSelected(item);
    setNotice("");
  };
  const renderCard = (item: PreviewItem) => (
    <article key={item.id} className="module-card">
      <div className="module-card-icon">
        <FileText size={20} />
      </div>
      <span className="module-tag">{item.status}</span>
      <h3>{item.name}</h3>
      <p>{item.detail}</p>
      <Button
        variant="ghost"
        onClick={() => openDetails(item)}
        aria-label={`Ver detalhes de ${item.name}`}
      >
        Explorar <ArrowRight size={15} />
      </Button>
    </article>
  );
  return (
    <div className="page-content module-workspace" ref={root}>
      <div className="page-heading module-heading">
        <div>
          <span className="eyebrow">{spec.group}</span>
          <h1>
            {spec.title}
            <span className="heading-dot">.</span>
          </h1>
          <p>{spec.description}</p>
        </div>
        {spec.action && (
          <Button className="module-primary-action" onClick={openForm}>
            <Plus size={17} />
            {spec.action}
          </Button>
        )}
      </div>
      <div className="module-preview-note">
        <span className="module-status-dot" />
        <span>Prévia de interface · exemplos temporários, sem operação real.</span>
      </div>
      {notice && (
        <p role="status" className="module-feedback">
          <Check size={16} />
          {notice}
        </p>
      )}

      {(spec.layout === "journey" || spec.layout === "connection") && (
        <div className="module-service-grid">
          <section className="module-panel module-main-panel">
            <div className="module-panel-heading">
              <span className="module-card-icon">
                <Unplug size={21} />
              </span>
              <span className="module-tag">
                {spec.layout === "connection" ? "Não conectado" : "Sem dados vinculados"}
              </span>
            </div>
            <h2>
              {spec.layout === "connection"
                ? "Uma conexão começa com confiança."
                : "Cada etapa, no seu tempo."}
            </h2>
            <p>
              {spec.layout === "connection"
                ? "Nenhum serviço ou dispositivo está conectado nesta demonstração. Aqui você poderá acompanhar origem, vínculo e atualização dos dados."
                : "Esta tela organiza o fluxo previsto. Os registros aparecerão após a configuração dos dados, permissões e regras correspondentes."}
            </p>
            <Button
              variant="outline"
              onClick={() =>
                openDetails({
                  id: "flow",
                  name: spec.title,
                  status: "Estrutura de interface",
                  detail: spec.description,
                })
              }
            >
              Conhecer o fluxo <ArrowRight size={16} />
            </Button>
          </section>
          <section className="module-panel">
            <h2>Próximas etapas</h2>
            <ol className="module-steps">
              {spec.steps.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{step}</strong>
                    <small>Estrutura prevista</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}

      {(spec.samples.length > 0 || spec.action) && (
        <section className="module-collection" aria-label={`Exemplos de ${spec.title}`}>
          <div className="module-toolbar">
            <div className="module-search">
              <Label htmlFor={`search-${spec.slug}`} className="search-label">Buscar em {spec.title.toLowerCase()}</Label>
              <Search size={17} />
              <Input
                id={`search-${spec.slug}`}
                aria-label={`Buscar em ${spec.title}`}
                placeholder={`Buscar em ${spec.title.toLowerCase()}…`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="module-filter">
              <ListFilter size={16} />
              <Label htmlFor={`filter-${spec.slug}`}>Situação</Label>
              <select
                id={`filter-${spec.slug}`}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option>Todos</option>
                <option>Exemplo</option>
                <option>Rascunho</option>
              </select>
            </div>
            <span className="module-result-count" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "item" : "itens"}
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="module-empty">
              <Search size={26} />
              <h2>Nenhum exemplo encontrado</h2>
              <p>Ajuste a busca ou a situação selecionada.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStatus("Todos");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          ) : spec.layout === "directory" ? (
            <div className="module-table-wrap">
              <table className="module-table">
                <thead>
                  <tr>
                    <th>{spec.fields[0]}</th>
                    <th>{spec.fields[1]}</th>
                    <th>Situação</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td data-label={spec.fields[0]}>
                        <strong>{item.name}</strong>
                        <small>Dados demonstrativos</small>
                      </td>
                      <td data-label={spec.fields[1]}>Sem vínculo real</td>
                      <td data-label="Situação">
                        <span className="module-tag">{item.status}</span>
                      </td>
                      <td data-label="Ações">
                        <Button
                          variant="ghost"
                          onClick={() => openDetails(item)}
                          aria-label={`Ver detalhes de ${item.name}`}
                        >
                          Detalhes <ArrowRight size={15} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : spec.layout === "board" ? (
            <div className="module-board">
              {["Exemplo", "Rascunho"].map((stage) => (
                <section key={stage}>
                  <h2>
                    {stage} <span>{filtered.filter((item) => item.status === stage).length}</span>
                  </h2>
                  {filtered.filter((item) => item.status === stage).map(renderCard)}
                  {!filtered.some((item) => item.status === stage) && (
                    <p className="module-board-empty">Nenhum item nesta etapa.</p>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className="module-card-grid">{filtered.map(renderCard)}</div>
          )}
        </section>
      )}

      <Dialog
        open={adding}
        onOpenChange={(open) => {
          setAdding(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent container={root.current} className="module-dialog">
          <DialogHeader>
            <DialogTitle>{spec.action}</DialogTitle>
            <DialogDescription>
              Experimente o layout com um exemplo fictício. Não insira dados pessoais ou clínicos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addPreview} noValidate className="module-form">
            <div>
              <Label htmlFor="preview-title">{spec.fields[0]}</Label>
              <Input
                id="preview-title"
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "preview-error" : undefined}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="preview-description">{spec.fields[1]}</Label>
              <Textarea
                id="preview-description"
                value={detail}
                maxLength={500}
                onChange={(event) => setDetail(event.target.value)}
                placeholder="Descreva apenas um exemplo fictício"
              />
            </div>
            {error && (
              <p role="alert" id="preview-error" className="module-error">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAdding(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Adicionar exemplo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent container={root.current} className="module-dialog">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>Detalhes da prévia · {spec.title}</DialogDescription>
          </DialogHeader>
          <span className="module-tag">{selected?.status}</span>
          <p className="module-detail-text">{selected?.detail || "Sem descrição adicional."}</p>
          <ol className="module-steps">
            {spec.steps.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
          <p className="module-disclaimer">
            Esta prévia não confirma cadastro, pagamento, autorização, aptidão médica ou conexão.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Voltar à tela
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
