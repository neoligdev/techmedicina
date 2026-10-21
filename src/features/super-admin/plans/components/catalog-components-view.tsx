import React, { useState } from "react";
import {
  Activity,
  Watch,
  Bot,
  FileText,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATALOG_COMPONENTS, type CatalogComponent, type CatalogComponentCode } from "../types";

export function CatalogComponentsView() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredComponents = CATALOG_COMPONENTS.filter((comp) => {
    if (categoryFilter === "all") return true;
    return comp.category === categoryFilter;
  });

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

  const getStatusBadge = (status: CatalogComponent["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs"
          >
            Ativo no Catálogo
          </Badge>
        );
      case "draft":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs"
          >
            Em Homologação
          </Badge>
        );
      case "pending_review":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs"
          >
            Revisão Comercial
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Informativo */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Catálogo Central de Componentes Comerciais (PRD v0.11.3)
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
            A plataforma Techmedicina adota a modelagem de componentes independentes. O Super ADM
            disponibiliza estes componentes centrais, e cada clínica parceira pode ter ofertas
            combinadas (ex: Pulseira + IA + TM-2) conforme suas políticas comerciais, sem duplicação
            de regras no código.
          </p>
        </div>
      </div>

      {/* Filtros de Categoria */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
        <span className="text-muted-foreground font-medium flex items-center gap-1 shrink-0 mr-1">
          <Filter className="h-3.5 w-3.5" />
          Filtrar por:
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
          Loja & Suplementos (1)
        </Button>
      </div>

      {/* Grid de Componentes */}
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
                  {comp.includedFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {comp.notes && (
                <div className="p-2.5 rounded bg-muted/30 border border-border/40 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Nota técnica: </span>
                  {comp.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
