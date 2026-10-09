import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Users,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { filterClinics } from "@/features/demo/data";
import { useDemoClinic } from "@/features/demo/context";
export function ClinicsPage() {
  const [search, setSearch] = useState("");
  const { selectClinic, clinics } = useDemoClinic();
  const results = filterClinics(search, clinics);

  const activeClinics = clinics.filter((c) => c.status === "Ativa").length;
  const totalLives = clinics.reduce((acc, c) => acc + c.enabledLives, 0);
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clínicas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClinics}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {clinics.length - activeClinics} em implantação
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vidas</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLives.toLocaleString("pt-BR")}</div>
            <p className="text-xs text-muted-foreground mt-1">Vidas habilitadas na base</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Global</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ ---</div>
            <p className="text-xs text-muted-foreground mt-1">Recurso não demonstrado</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avisos</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning-ink" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground mt-1">Sem dados financeiros vinculados</p>
          </CardContent>
        </Card>
      </div>

      <section className="clinics-section" aria-label="Clínicas cadastradas">
        <div className="table-toolbar">
          <div className="section-title">
            <h2>Clínicas cadastradas</h2>
            <span className="count-badge">{clinics.length}</span>
          </div>
          <div className="search-field">
            <label htmlFor="clinic-search" className="search-label">
              Buscar clínica
            </label>
            <Search size={18} />
            <Input
              id="clinic-search"
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
                  <td data-label="Clínica">
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
                  <td data-label="Situação">
                    <span
                      className={`status-badge ${clinic.status === "Ativa" ? "status-active" : "status-pending"}`}
                    >
                      <span />
                      {clinic.status}
                    </span>
                  </td>
                  <td data-label="Vidas habilitadas">
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
          <span aria-live="polite">
            {results.length} de {clinics.length} clínicas
          </span>
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
