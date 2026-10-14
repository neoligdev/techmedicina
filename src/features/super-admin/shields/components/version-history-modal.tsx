import { ShieldVersionRecord } from "../types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { History, RotateCcw, Calendar, User, CheckCircle } from "lucide-react";

interface VersionHistoryModalProps {
  history: ShieldVersionRecord[];
  currentVersion: string;
  isOpen: boolean;
  onClose: () => void;
  onRollback: (targetVersion: string) => void;
}

export function VersionHistoryModal({
  history,
  currentVersion,
  isOpen,
  onClose,
  onRollback,
}: VersionHistoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <DialogTitle className="text-lg font-bold">Histórico de Versões Oficiais</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Registro imutável de publicações da Biblioteca de Escudos e capacidade de rollback para
            versões anteriores.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
          {history.map((record) => {
            const isCurrent = record.version === currentVersion;
            return (
              <div
                key={record.version + record.publishedAt}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? "border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
                      v{record.version}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Versão Ativa
                      </span>
                    )}
                  </div>
                  {!isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRollback(record.version)}
                      className="text-xs h-7 gap-1 text-slate-700 hover:text-indigo-600"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reverter para esta
                    </Button>
                  )}
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                  {record.changeSummary}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(record.publishedAt).toLocaleString("pt-BR")}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {record.publishedBy}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
