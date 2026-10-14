import { useState } from "react";
import { ShieldArtAsset, ShieldArtVariant } from "../types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, Sun, Moon, Grid, ShieldCheck, Clock } from "lucide-react";

interface ShieldArtCardProps {
  assets: Record<ShieldArtVariant, ShieldArtAsset>;
  onEditAsset: (asset: ShieldArtAsset) => void;
}

export function ShieldArtCard({ assets, onEditAsset }: ShieldArtCardProps) {
  const [selectedVariant, setSelectedVariant] = useState<ShieldArtVariant>("active");
  const [bgMode, setBgMode] = useState<"light" | "dark" | "checker">("light");

  const currentAsset = assets[selectedVariant];
  const shortHash = currentAsset.svgHash.slice(0, 8);

  const bgClasses = {
    light: "bg-white border-slate-200",
    dark: "bg-slate-900 border-slate-800 text-white",
    checker:
      "bg-slate-100 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px]",
  };

  return (
    <Card className="flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full inline-block"
              style={{ backgroundColor: currentAsset.themeColor }}
            />
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {currentAsset.name.split("—")[0]?.trim()}
            </CardTitle>
          </div>
          <Badge
            variant={currentAsset.status === "published" ? "default" : "secondary"}
            className={
              currentAsset.status === "published"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-amber-500 text-white hover:bg-amber-600"
            }
          >
            {currentAsset.status === "published" ? "Oficial Publicado" : "Rascunho"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col items-center">
        {/* Controles de variantes */}
        <div className="w-full flex rounded-lg p-1 bg-slate-100 dark:bg-slate-800 mb-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setSelectedVariant("active")}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              selectedVariant === "active"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Ativo
          </button>
          <button
            type="button"
            onClick={() => setSelectedVariant("earned")}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              selectedVariant === "earned"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Conquistado
          </button>
          <button
            type="button"
            onClick={() => setSelectedVariant("locked")}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              selectedVariant === "locked"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Bloqueado
          </button>
        </div>

        {/* Pré-visualização do SVG */}
        <div className="relative w-full aspect-square max-w-[200px] rounded-xl flex items-center justify-center p-4 border transition-colors mb-3">
          <div className={`absolute inset-0 rounded-xl transition-colors ${bgClasses[bgMode]}`} />
          <div
            className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none drop-shadow-sm"
            dangerouslySetInnerHTML={{ __html: currentAsset.svgContent }}
          />
          {/* Seletor de fundo de contraste */}
          <div className="absolute bottom-2 right-2 z-20 flex gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-md border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setBgMode("light")}
              className={`p-1 rounded ${bgMode === "light" ? "bg-slate-200 dark:bg-slate-600" : ""}`}
              title="Fundo Claro"
            >
              <Sun className="w-3 h-3 text-amber-600" />
            </button>
            <button
              type="button"
              onClick={() => setBgMode("dark")}
              className={`p-1 rounded ${bgMode === "dark" ? "bg-slate-200 dark:bg-slate-600" : ""}`}
              title="Fundo Escuro"
            >
              <Moon className="w-3 h-3 text-slate-700 dark:text-slate-300" />
            </button>
            <button
              type="button"
              onClick={() => setBgMode("checker")}
              className={`p-1 rounded ${bgMode === "checker" ? "bg-slate-200 dark:bg-slate-600" : ""}`}
              title="Fundo Transparente"
            >
              <Grid className="w-3 h-3 text-slate-600" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 text-center mb-2 px-1 line-clamp-2">
          {currentAsset.description}
        </p>

        {/* Metadados técnicos */}
        <div className="w-full flex justify-between items-center text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2 mt-auto">
          <span className="flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3 h-3 text-slate-400" />v{currentAsset.version} ({shortHash})
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {new Date(currentAsset.updatedAt).toLocaleDateString("pt-BR")}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-3 px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEditAsset(currentAsset)}
          className="w-full text-xs flex items-center justify-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          Substituir Arte (SVG)
        </Button>
      </CardFooter>
    </Card>
  );
}
