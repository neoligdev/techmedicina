import { ShieldArtImage } from "./shield-art-image";
import { useState } from "react";
import { ShieldArtAsset } from "../types";
import { validateAndSanitizeSvg } from "../sanitizer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

interface ShieldUploadModalProps {
  asset: ShieldArtAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (assetId: string, sanitizedSvg: string) => boolean;
}

export function ShieldUploadModal({ asset, isOpen, onClose, onSave }: ShieldUploadModalProps) {
  const [svgInput, setSvgInput] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sanitizedPreview, setSanitizedPreview] = useState<string | null>(null);
  const [newHash, setNewHash] = useState<string | null>(null);

  if (!asset) return null;

  const handleInputChange = (value: string) => {
    setSvgInput(value);
    if (!value.trim()) {
      setValidationError(null);
      setSanitizedPreview(null);
      setNewHash(null);
      return;
    }

    const res = validateAndSanitizeSvg(value);
    if (res.isValid && res.sanitizedSvg && res.hash) {
      setValidationError(null);
      setSanitizedPreview(res.sanitizedSvg);
      setNewHash(res.hash);
    } else {
      setValidationError(res.error || "SVG inválido.");
      setSanitizedPreview(null);
      setNewHash(null);
    }
  };

  const handleSave = () => {
    if (!sanitizedPreview) return;
    if (!onSave(asset.id, sanitizedPreview)) {
      setValidationError("Não foi possível salvar. Sua edição foi mantida; tente novamente.");
      return;
    }
    handleClose();
  };

  const handleClose = () => {
    setSvgInput("");
    setValidationError(null);
    setSanitizedPreview(null);
    setNewHash(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Substituir Arte Oficial</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Atualizando o ativo <strong>{asset.name}</strong>. O novo arquivo passará por
            sanitização rigorosa anti-XSS e será salvo como rascunho.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Alerta de sanitização */}
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 py-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-xs font-semibold">Sanitização Rigorosa Ativa</AlertTitle>
            <AlertDescription className="text-[11px]">
              Scripts, eventos inline (onload, etc.), objetos externos e entidades XML são
              estritamente bloqueados. Máximo de 256 KB.
            </AlertDescription>
          </Alert>

          {/* Campo de código SVG */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Cole o código vetorial SVG abaixo:
            </label>
            <textarea
              value={svgInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">...</svg>'
              className="w-full h-32 p-2.5 font-mono text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Mensagens de validação */}
          {validationError && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">Validação Reprovada</AlertTitle>
              <AlertDescription className="text-xs">{validationError}</AlertDescription>
            </Alert>
          )}

          {sanitizedPreview && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>SVG sanitizado com sucesso! SHA-256: {newHash?.slice(0, 12)}...</span>
              </div>

              {/* Pré-visualização comparativa */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 font-medium mb-1">Arte Atual</span>
                  <ShieldArtImage
                    className="w-20 h-20 bg-white dark:bg-slate-900 border rounded-md p-2 object-contain"
                    svg={asset.svgContent}
                    label="Arte atual do Escudo"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-emerald-600 font-medium mb-1">Nova Prévia</span>
                  <ShieldArtImage
                    className="w-20 h-20 bg-white dark:bg-slate-900 border border-emerald-500 rounded-md p-2 object-contain"
                    svg={sanitizedPreview}
                    label="Prévia do novo Escudo"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!sanitizedPreview}
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Salvar como Rascunho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
