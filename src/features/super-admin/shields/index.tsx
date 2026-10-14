import { useState, useEffect } from "react";
import { ShieldArtAsset, ShieldCatalogState, ShieldArtVariant } from "./types";
import {
  getShieldCatalog,
  updateShieldAsset,
  publishCatalogVersion,
  rollbackToVersion,
  UserAuthContext,
} from "./storage";
import { ShieldArtCard } from "./components/shield-art-card";
import { ShieldUploadModal } from "./components/shield-upload-modal";
import { VersionHistoryModal } from "./components/version-history-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Shield,
  Layers,
  History,
  Send,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { ShieldId } from "@/features/journey/contracts";

// Contexto administrativo padrão do Super ADM
const currentSuperAdminContext: UserAuthContext = {
  userId: "super_admin_operador",
  role: "super_admin",
};

export function ShieldsLibraryPage() {
  const [catalog, setCatalog] = useState<ShieldCatalogState>(getShieldCatalog());
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [editingAsset, setEditingAsset] = useState<ShieldArtAsset | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishVersionInput, setPublishVersionInput] = useState("");
  const [publishSummaryInput, setPublishSummaryInput] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setCatalog(getShieldCatalog());
  }, []);

  const assetsList = Object.values(catalog.assets);
  const draftCount = assetsList.filter((a) => a.status === "draft").length;

  // Agrupamento por ShieldId (5 escudos principais)
  const shieldIds: ShieldId[] = ["origem", "ritmo", "avanco", "equilibrio", "plenitude"];
  const filteredShields =
    selectedFilter === "all" ? shieldIds : shieldIds.filter((id) => id === selectedFilter);

  const handleSaveAsset = (assetId: string, sanitizedSvg: string) => {
    const res = updateShieldAsset({
      assetId,
      rawSvg: sanitizedSvg,
      userContext: currentSuperAdminContext,
    });

    if (res.success) {
      setCatalog(getShieldCatalog());
      setNotification({
        type: "success",
        message: `Arte atualizada como rascunho com sucesso! Lembre-se de publicar uma nova versão oficial.`,
      });
    } else {
      setNotification({
        type: "error",
        message: res.error || "Erro ao salvar ativo.",
      });
    }
  };

  const handlePublish = () => {
    if (!publishVersionInput.trim()) return;

    const res = publishCatalogVersion({
      newVersion: publishVersionInput.trim(),
      changeSummary: publishSummaryInput.trim() || "Nova versão oficial de artes homologada.",
      userContext: currentSuperAdminContext,
    });

    if (res.success && res.catalog) {
      setCatalog(res.catalog);
      setIsPublishOpen(false);
      setPublishVersionInput("");
      setPublishSummaryInput("");
      setNotification({
        type: "success",
        message: `Versão v${res.catalog.version} publicada com sucesso em toda a plataforma!`,
      });
    } else {
      setNotification({
        type: "error",
        message: res.error || "Falha ao publicar versão.",
      });
    }
  };

  const handleRollback = (targetVersion: string) => {
    const res = rollbackToVersion({
      targetVersion,
      userContext: currentSuperAdminContext,
    });

    if (res.success && res.catalog) {
      setCatalog(res.catalog);
      setIsHistoryOpen(false);
      setNotification({
        type: "success",
        message: `Rollback para a versão v${targetVersion} realizado com sucesso!`,
      });
    } else {
      setNotification({
        type: "error",
        message: res.error || "Falha ao realizar rollback.",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Biblioteca Central de Artes dos Escudos
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            Gestão oficial dos 5 Escudos da JORNADA e suas 15 variações gráficas. Ativos controlados
            exclusivamente pela PlugPix Techmedicina e distribuídos para os PWAs White Label.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="text-xs gap-1.5"
          >
            <History className="w-4 h-4 text-slate-600" />
            Histórico de Versões
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setPublishVersionInput(`1.${catalog.history.length}.0`);
              setIsPublishOpen(true);
            }}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="w-4 h-4" />
            Publicar Versão Oficial
          </Button>
        </div>
      </div>

      {/* Alerta de notificação */}
      {notification && (
        <Alert
          className={
            notification.type === "success"
              ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 py-3"
              : "border-red-200 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 py-3"
          }
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <AlertTitle className="text-xs font-semibold">
            {notification.type === "success" ? "Operação Concluída" : "Atenção"}
          </AlertTitle>
          <AlertDescription className="text-xs">{notification.message}</AlertDescription>
        </Alert>
      )}

      {/* Métricas e Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">
              Total de Ativos Oficiais
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              15 Variações
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Escudos da Jornada</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              5 Patamares
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">
              Versão Oficial Vigente
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              v{catalog.version}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-lg">
            <History className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">
              Rascunhos Pendentes
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {draftCount}
              </span>
              {draftCount > 0 && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                  Aguardando Publicação
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Banner Informativo de Regras White Label */}
      <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 py-3">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-xs font-semibold">
          Integridade White Label (PRD v0.11.3 §11.7)
        </AlertTitle>
        <AlertDescription className="text-xs leading-relaxed">
          As regras de cálculo, limiares, nomes e símbolos oficiais dos Escudos são de controle
          exclusivo da PlugPix. As clínicas aplicam temas cromáticos apenas à interface do
          aplicativo, sem poder alterar os critérios ou substituir as artes centrais da JORNADA.
        </AlertDescription>
      </Alert>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <span className="text-xs font-medium text-slate-500 mr-1">Filtrar por Escudo:</span>
        {[
          { id: "all", label: "Todos os 5 Escudos" },
          { id: "origem", label: "Origem (0–29)" },
          { id: "ritmo", label: "Ritmo (30–54)" },
          { id: "avanco", label: "Avanço (55–74)" },
          { id: "equilibrio", label: "Equilíbrio (75–89)" },
          { id: "plenitude", label: "Plenitude (90–100)" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedFilter(f.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedFilter === f.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid com os Cartões dos Escudos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {filteredShields.map((shieldId) => {
          const shieldAssets: Record<ShieldArtVariant, ShieldArtAsset> = {
            active: catalog.assets[`${shieldId}_active`]!,
            earned: catalog.assets[`${shieldId}_earned`]!,
            locked: catalog.assets[`${shieldId}_locked`]!,
          };

          return (
            <ShieldArtCard
              key={shieldId}
              assets={shieldAssets}
              onEditAsset={(asset) => setEditingAsset(asset)}
            />
          );
        })}
      </div>

      {/* Modal de Upload e Sanitização */}
      <ShieldUploadModal
        asset={editingAsset}
        isOpen={!!editingAsset}
        onClose={() => setEditingAsset(null)}
        onSave={handleSaveAsset}
      />

      {/* Modal de Histórico de Versões */}
      <VersionHistoryModal
        history={catalog.history}
        currentVersion={catalog.version}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRollback={handleRollback}
      />

      {/* Diálogo simples para publicar nova versão */}
      {isPublishOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Publicar Nova Versão Oficial
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Esta ação homologará todas as alterações pendentes como oficiais na versão informada.
              As clínicas e os aplicativos PWA consumirão imediatamente os novos ativos publicados.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Número da Nova Versão (SemVer):
                </label>
                <input
                  type="text"
                  value={publishVersionInput}
                  onChange={(e) => setPublishVersionInput(e.target.value)}
                  placeholder="1.1.0"
                  className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Resumo das Alterações (Changelog):
                </label>
                <textarea
                  value={publishSummaryInput}
                  onChange={(e) => setPublishSummaryInput(e.target.value)}
                  placeholder="Ex: Atualização dos gradientes dos escudos Origem e Ritmo."
                  className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 h-20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsPublishOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handlePublish}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Confirmar e Publicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
