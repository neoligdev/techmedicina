import React, { useState, useMemo } from "react";
import {
  Activity,
  Watch,
  Bot,
  FileText,
  ShoppingBag,
  CheckCircle2,
  Filter,
  Layers,
  Sparkles,
  Search,
  X,
  Info,
  Clock,
  ShieldCheck,
  PackageCheck,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CATALOG_COMPONENTS,
  REFERENCE_PACKAGES,
  type CatalogComponent,
  type CatalogComponentCode,
  type ReferencePackage,
} from "../types";

export function CatalogComponentsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"components" | "packages">("components");
  const [selectedComponent, setSelectedComponent] = useState<CatalogComponent | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ReferencePackage | null>(null);

  // Filtragem de componentes
  const filteredComponents = useMemo(() => {
    return CATALOG_COMPONENTS.filter((comp) => {
      const matchesCategory = categoryFilter === "all" || comp.category === categoryFilter;
      const term = searchTerm.trim().toLowerCase();
      if (!term) return matchesCategory;

      const matchesTerm =
        comp.code.toLowerCase().includes(term) ||
        comp.name.toLowerCase().includes(term) ||
        comp.description.toLowerCase().includes(term) ||
        comp.includedFeatures.some((f) => f.toLowerCase().includes(term)) ||
        (comp.notes && comp.notes.toLowerCase().includes(term));

      return matchesCategory && matchesTerm;
    });
  }, [categoryFilter, searchTerm]);

  // Filtragem de pacotes de referência
  const filteredPackages = useMemo(() => {
    return REFERENCE_PACKAGES.filter((pkg) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;

      return (
        pkg.name.toLowerCase().includes(term) ||
        pkg.description.toLowerCase().includes(term) ||
        pkg.tierLabel.toLowerCase().includes(term) ||
        pkg.rulesSummary.some((r) => r.toLowerCase().includes(term)) ||
        pkg.components.some((c) => c.toLowerCase().includes(term))
      );
    });
  }, [searchTerm]);

  const getCategoryIcon = (category: CatalogComponent["category"]) => {
    switch (category) {
      case "telemedicine":
        return <Activity className="h-4 w-4 text-sky-500" />;
      case "device":
        return <Watch className="h-4 w-4 text-emerald-500" />;
      case "ai":
        return <Bot className="h-4 w-4 text-violet-500" />;
      case "protocol":
        return <FileText className="h-4 w-4 text-amber-500" />;
      case "store":
        return <ShoppingBag className="h-4 w-4 text-rose-500" />;
      default:
        return <Layers className="h-4 w-4 text-primary" />;
    }
  };

  const getCategoryLabel = (category: CatalogComponent["category"]) => {
    switch (category) {
      case "telemedicine":
        return "Telemedicina";
      case "device":
        return "Dispositivo / Hardware";
      case "ai":
        return "Inteligência Artificial";
      case "protocol":
        return "Protocolos Médicos";
      case "store":
        return "Loja & Suplementos";
      default:
        return category;
    }
  };

  const getStatusBadge = (status: CatalogComponent["status"] | ReferencePackage["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-medium"
          >
            Ativo no Catálogo
          </Badge>
        );
      case "draft":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-medium"
          >
            Em Homologação
          </Badge>
        );
      case "pending_review":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-medium"
          >
            Revisão Comercial
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (val === null || val === undefined) return "A definir em contrato";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Banner Informativo sobre Arquitetura Comercial */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            Catálogo Central de Componentes Comerciais (PRD v0.11.3)
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
            A plataforma Techmedicina adota a modelagem de componentes independentes (ingredientes
            comerciais N:N). O Super ADM disponibiliza estes componentes e modelos de referência, e
            cada clínica parceira White Label pode montar suas próprias ofertas aos pacientes sem
            duplicação de código.
          </p>
          <p className="text-[11px] text-muted-foreground/90 pt-1">
            <strong>Governança de Especialidades:</strong> O escopo prevê até 32 especialidades
            médicas agendadas (TM-3) mais 3 áreas multidisciplinares independentes (Nutrição,
            Psicologia e Educador Físico, totalizando 35 áreas no escopo amplo). A relação fechada
            das 32 áreas médicas permanece pendente de consolidação oficial pelo proprietário (PRD
            Seção 13.2).
          </p>
        </div>

        {/* Seletor de Modo de Exibição */}
        <div className="flex items-center gap-1 bg-background/80 p-1 rounded-lg border border-border shrink-0 text-xs">
          <Button
            type="button"
            variant={viewMode === "components" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("components")}
            className="h-7 text-xs font-medium gap-1.5"
          >
            <Layers className="h-3.5 w-3.5" />
            Componentes Oficiais ({CATALOG_COMPONENTS.length})
          </Button>
          <Button
            type="button"
            variant={viewMode === "packages" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("packages")}
            className="h-7 text-xs font-medium gap-1.5"
          >
            <PackageCheck className="h-3.5 w-3.5" />
            Planos de Referência ({REFERENCE_PACKAGES.length})
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={
              viewMode === "components"
                ? "Buscar componente por código, nome ou recurso..."
                : "Buscar pacote ou modelo de plano..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs"
            aria-label="Campo de busca no catálogo"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Limpar termo de busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtros de Categoria (apenas no modo componentes) */}
        {viewMode === "components" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1 shrink-0 mr-1 text-[11px]">
              <Filter className="h-3 w-3" />
              Filtrar:
            </span>
            <Button
              type="button"
              variant={categoryFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("all")}
              className="h-7 text-xs"
            >
              Todos ({CATALOG_COMPONENTS.length})
            </Button>
            <Button
              type="button"
              variant={categoryFilter === "telemedicine" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("telemedicine")}
              className="h-7 text-xs"
            >
              Telemedicina (3)
            </Button>
            <Button
              type="button"
              variant={categoryFilter === "device" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("device")}
              className="h-7 text-xs"
            >
              Dispositivos (3)
            </Button>
            <Button
              type="button"
              variant={categoryFilter === "ai" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("ai")}
              className="h-7 text-xs"
            >
              Dr. IA (1)
            </Button>
            <Button
              type="button"
              variant={categoryFilter === "protocol" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("protocol")}
              className="h-7 text-xs"
            >
              Protocolos (1)
            </Button>
            <Button
              type="button"
              variant={categoryFilter === "store" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("store")}
              className="h-7 text-xs"
            >
              Loja (1)
            </Button>
          </div>
        )}
      </div>

      {/* Grid de Componentes Oficiais */}
      {viewMode === "components" && (
        <>
          {filteredComponents.length === 0 ? (
            <div className="p-12 text-center border rounded-xl border-dashed bg-muted/10 space-y-3">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Nenhum componente encontrado
                </p>
                <p className="text-xs text-muted-foreground">
                  Não encontramos nenhum item correspondente aos critérios de busca ou filtros.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                }}
                className="text-xs"
              >
                Limpar Busca e Filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredComponents.map((comp) => (
                <Card
                  key={comp.code}
                  className="flex flex-col border-border/60 bg-card shadow-sm hover:border-primary/40 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                            {comp.code}
                          </span>
                          {getStatusBadge(comp.status)}
                        </div>
                        <CardTitle className="text-base font-semibold pt-1">{comp.name}</CardTitle>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/60 shrink-0">
                        {getCategoryIcon(comp.category)}
                      </div>
                    </div>
                    <CardDescription className="text-xs pt-1 line-clamp-2">
                      {comp.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3 text-xs pt-0">
                    <div className="space-y-1.5 border-t border-border/40 pt-3">
                      <span className="font-medium text-foreground block">Recursos Incluídos:</span>
                      <ul className="space-y-1 text-muted-foreground">
                        {comp.includedFeatures.slice(0, 3).map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{feat}</span>
                          </li>
                        ))}
                        {comp.includedFeatures.length > 3 && (
                          <li className="text-[11px] text-muted-foreground font-medium pl-5">
                            + {comp.includedFeatures.length - 3} outros recursos
                          </li>
                        )}
                      </ul>
                    </div>

                    {comp.notes && (
                      <div className="p-2.5 rounded bg-muted/30 border border-border/40 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Regra técnica: </span>
                        <span className="line-clamp-2">{comp.notes}</span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2 border-t border-border/40 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedComponent(comp)}
                      className="text-xs gap-1.5 h-8 text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span>Detalhar Componente</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Grid de Pacotes de Referência (Modelos Centrais) */}
      {viewMode === "packages" && (
        <>
          {filteredPackages.length === 0 ? (
            <div className="p-12 text-center border rounded-xl border-dashed bg-muted/10 space-y-3">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Nenhum pacote encontrado</p>
                <p className="text-xs text-muted-foreground">
                  Não encontramos nenhum modelo de pacote com o termo pesquisado.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="text-xs"
              >
                Limpar Busca
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredPackages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="flex flex-col border-border/60 bg-card shadow-sm hover:border-primary/40 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="secondary"
                        className="text-[11px] font-semibold tracking-wide"
                      >
                        {pkg.tierLabel}
                      </Badge>
                      {getStatusBadge(pkg.status)}
                    </div>
                    <CardTitle className="text-lg font-bold pt-2">{pkg.name}</CardTitle>
                    <CardDescription className="text-xs pt-1 line-clamp-3">
                      {pkg.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4 text-xs pt-0">
                    {/* Componentes Integrados no Pacote */}
                    <div className="space-y-1.5 border-t border-border/40 pt-3">
                      <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider">
                        Componentes Incluídos:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.components.map((code) => (
                          <Badge
                            key={code}
                            variant="outline"
                            className="bg-muted/60 font-mono text-xs px-2 py-0.5"
                          >
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Preços Estimados de Referência */}
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                          Parâmetros Comerciais:
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 text-muted-foreground font-normal"
                        >
                          Template Opcional
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {pkg.pricingModel.pricingNote}
                      </p>
                      <div className="pt-1 text-[11px] space-y-0.5 text-muted-foreground border-t border-border/40">
                        <div>
                          Setup:{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(pkg.pricingModel.setupFeeEstimated)}
                          </span>
                        </div>
                        <div>
                          Mensalidade base:{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(pkg.pricingModel.monthlyBaseFee)}
                          </span>
                        </div>
                        <div>
                          Custo por vida:{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(pkg.pricingModel.perLifeFee)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Regras e Diretrizes */}
                    <div className="space-y-1.5">
                      <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider">
                        Diretrizes de Atendimento:
                      </span>
                      <ul className="space-y-1 text-muted-foreground">
                        {pkg.rulesSummary.map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 border-t border-border/40 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPackage(pkg)}
                      className="text-xs gap-1.5 h-8 text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span>Detalhes do Modelo</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de Detalhamento do Componente Oficial */}
      <Dialog
        open={!!selectedComponent}
        onOpenChange={(open) => !open && setSelectedComponent(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedComponent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-muted text-foreground border border-border">
                    {selectedComponent.code}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(selectedComponent.category)}
                  </Badge>
                  {getStatusBadge(selectedComponent.status)}
                </div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {selectedComponent.name}
                </DialogTitle>
                <DialogDescription className="text-xs pt-1 leading-relaxed text-muted-foreground">
                  {selectedComponent.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Recursos Incluídos */}
                <div className="space-y-2 p-3.5 rounded-lg border border-border bg-card">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Escopo e Recursos Oficiais Habilitados
                  </h4>
                  <ul className="space-y-1.5 pt-1 text-muted-foreground">
                    {selectedComponent.includedFeatures.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Regras Comerciais e Operacionais do PRD */}
                {selectedComponent.notes && (
                  <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1.5">
                    <h4 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Regras de Negócio e Parâmetros (PRD v0.11.3)
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {selectedComponent.notes}
                    </p>
                  </div>
                )}

                {/* Esclarecimento sobre as Três Camadas Comerciais */}
                <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Governança em Três Camadas (PRD Seção 13.4)
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    1. <strong>Contrato PlugPix↔Clínica:</strong> O Super ADM define o valor do
                    setup, mensalidade e teto de vidas contratadas pela clínica.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    2. <strong>Catálogo Central:</strong> Este componente ({selectedComponent.code})
                    é disponibilizado pelo Super ADM à clínica como ingrediente independente.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    3. <strong>Oferta Clínica↔Paciente:</strong> A clínica define o preço final e as
                    condições vendidas ao cliente em sua marca White Label, sem restrição arbitrária
                    ao número de planos.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedComponent(null)}
                  className="text-xs"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhamento do Pacote de Referência */}
      <Dialog open={!!selectedPackage} onOpenChange={(open) => !open && setSelectedPackage(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedPackage && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {selectedPackage.tierLabel}
                  </Badge>
                  {getStatusBadge(selectedPackage.status)}
                </div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {selectedPackage.name}
                </DialogTitle>
                <DialogDescription className="text-xs pt-1 leading-relaxed text-muted-foreground">
                  {selectedPackage.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Ingredientes do Pacote */}
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-primary" />
                    Componentes Centrais Habilitados
                  </h4>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedPackage.components.map((code) => {
                      const comp = CATALOG_COMPONENTS.find((c) => c.code === code);
                      return (
                        <div
                          key={code}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted/40 text-xs"
                        >
                          <span className="font-mono font-bold text-primary">{code}</span>
                          <span className="text-muted-foreground">
                            {comp ? `— ${comp.name}` : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Estrutura Comercial */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Parâmetros Comerciais de Referência
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      Não Vinculante
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedPackage.pricingModel.pricingNote} (PRD Adendo §1 e Seção 13.4).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-2.5 rounded bg-background border border-border">
                      <span className="text-muted-foreground block text-[11px]">
                        Setup Estimado:
                      </span>
                      <strong className="text-xs font-semibold text-foreground">
                        {formatCurrency(selectedPackage.pricingModel.setupFeeEstimated)}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded bg-background border border-border">
                      <span className="text-muted-foreground block text-[11px]">
                        Mensalidade Base:
                      </span>
                      <strong className="text-xs font-semibold text-foreground">
                        {formatCurrency(selectedPackage.pricingModel.monthlyBaseFee)}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded bg-background border border-border">
                      <span className="text-muted-foreground block text-[11px]">
                        Preço por Vida:
                      </span>
                      <strong className="text-xs font-semibold text-foreground">
                        {formatCurrency(selectedPackage.pricingModel.perLifeFee)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Regras e Diretrizes de Utilização */}
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Regras de Utilização e Entitlements
                  </h4>
                  <ul className="space-y-1.5 pt-1 text-muted-foreground">
                    {selectedPackage.rulesSummary.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPackage(null)}
                  className="text-xs"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
