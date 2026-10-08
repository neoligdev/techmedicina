import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ArrowUpRight, Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterClinics } from "@/features/demo/data";
import { useDemoClinic } from "@/features/demo/context";
export function ClinicsPage() {
  const [search, setSearch] = useState("");
  const { selectClinic, clinics } = useDemoClinic();
  const results = filterClinics(search, clinics);
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">GESTÃO DA PLATAFORMA</span>
          <h1>
            Clínicas<span className="heading-dot">.</span>
          </h1>
          <p>Um olhar sobre as clínicas que fazem parte da sua rede.</p>
        </div>
        <div className="network-label">
          <Building2 size={17} />
          <span>Rede PlugPix</span>
        </div>
      </div>
      <section className="clinics-section" aria-label="Clínicas cadastradas">
        <div className="table-toolbar">
          <div className="section-title">
            <h2>Clínicas cadastradas</h2>
            <span className="count-badge">2</span>
          </div>
          <div className="search-field">
            <Search size={18} />
            <Input
              aria-label="Buscar clínica por nome"
              placeholder="Buscar clínica por nome..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table className="clinics-table">
            <thead>
              <tr>
                <th>Clínica</th>
                <th>Situação</th>
                <th>Vidas habilitadas</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((clinic) => (
                <tr key={clinic.id}>
                  <td>
                    <div className="clinic-name">
                      <div className="clinic-avatar" data-clinic-theme={clinic.theme}>
                        {clinic.initials}
                      </div>
                      <div>
                        <strong>{clinic.name}</strong>
                        <span>Clínica parceira</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${clinic.status === "Ativa" ? "status-active" : "status-pending"}`}
                    >
                      <span />
                      {clinic.status}
                    </span>
                  </td>
                  <td>
                    <span className="lives-value">
                      {clinic.enabledLives.toLocaleString("pt-BR")}
                    </span>
                    <span className="lives-label">vidas</span>
                  </td>
                  <td>
                    <Button variant="outline" asChild className="view-clinic">
                      <Link to="/clinica" onClick={() => selectClinic(clinic.id)}>
                        Visualizar clínica
                        <ArrowUpRight size={16} />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {results.length === 0 && (
          <div className="empty-search">
            <Search size={26} />
            <h3>Nenhuma clínica encontrada</h3>
            <p>Tente buscar por outro nome.</p>
            <Button variant="ghost" onClick={() => setSearch("")}>
              Limpar busca
            </Button>
          </div>
        )}
        <div className="table-footer">
          <span>{results.length} de 2 clínicas</span>
          <span>Dados demonstrativos</span>
        </div>
      </section>
      <div className="network-note">
        <span className="note-icon">
          <Building2 size={21} strokeWidth={1.5} />
        </span>
        <div>
          <strong>Uma rede conectada ao cuidado.</strong>
          <p>PlugPix Techmedicina</p>
        </div>
        <ChevronRight size={18} />
      </div>
    </div>
  );
}
