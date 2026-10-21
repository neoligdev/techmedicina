import React, { useState } from "react";
import { Copy, Check, Info, ShieldAlert, Globe, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDomainDnsInstruction, type ReservedDomain } from "./types";

interface DomainDnsInstructionsProps {
  domain: ReservedDomain;
  challengeToken?: string;
  className?: string;
}

export function DomainDnsInstructions({
  domain,
  challengeToken,
  className = "",
}: DomainDnsInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const instruction = getDomainDnsInstruction(domain.hostname, challengeToken);
  const isChallengeConfirmed = instruction.hasConfirmedChallenge;

  const copyToClipboard = async (text: string, fieldName: string) => {
    // Bloqueia cópia se for valor TXT não confirmado
    if ((fieldName === "value" || fieldName === "all") && !isChallengeConfirmed) {
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2200);
      }
    } catch {
      // Ignorar fallback silencioso
    }
  };

  const fullInstructions = isChallengeConfirmed
    ? `Instruções de Apontamento DNS PlugPix Techmedicina:
Domínio: ${domain.hostname}
Tipo: ${instruction.type}
Nome / Entrada: ${instruction.name}
Valor / Conteúdo: ${instruction.value}
TTL sugerido: 300 segundos (ou 5 minutos)`
    : "";

  return (
    <Card className={`border-border/60 bg-card/60 shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Globe size={18} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Instruções de Configuração DNS TXT
              </CardTitle>
              <CardDescription className="text-xs">
                {isChallengeConfirmed
                  ? `Desafio emitido e pronto para apontamento em ${domain.hostname}`
                  : `Orientações gerais para o domínio ${domain.hostname}`}
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isChallengeConfirmed}
            onClick={() => copyToClipboard(fullInstructions, "all")}
            className="text-xs h-8 gap-1.5"
            title={
              isChallengeConfirmed
                ? "Copiar todas as instruções de DNS"
                : "Cópia desabilitada: aguardando desafio oficial do backend."
            }
            aria-label="Copiar todas as instruções de DNS"
          >
            {copiedField === "all" ? (
              <>
                <Check size={14} className="text-emerald-500" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copiar tudo</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {/* Banner de Aviso quando não há token confirmado */}
        {!isChallengeConfirmed && (
          <div
            className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-1.5"
            role="status"
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <span>Orientações Gerais — Desafio Não Emitido:</span>
            </div>
            <p className="leading-relaxed">
              O token criptográfico definitivo de 256 bits ainda não foi emitido ou carregado por
              endpoint seguro do servidor. O formato abaixo é um{" "}
              <strong>exemplo ilustrativo</strong>. A ação de cópia do valor TXT está desabilitada
              para evitar o cadastro de valores inexistentes no DNS.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="p-3 rounded-lg border border-border/60 bg-background/50">
            <div className="text-xs text-muted-foreground font-medium mb-1">Tipo de Registro</div>
            <div className="font-mono font-bold text-sm text-primary">{instruction.type}</div>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-background/50 sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-medium">
                Nome do Registro / Host
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(instruction.name, "name")}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                title="Copiar nome do registro"
                aria-label="Copiar nome do registro DNS"
              >
                {copiedField === "name" ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} />
                )}
                <span>{copiedField === "name" ? "Copiado" : "Copiar"}</span>
              </button>
            </div>
            <div className="font-mono text-xs break-all text-foreground select-all bg-muted/40 p-1.5 rounded">
              {instruction.name}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/60 bg-background/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">
              Valor / Conteúdo TXT{" "}
              {!isChallengeConfirmed && (
                <span className="text-amber-500 text-[11px] font-normal">
                  (Ilustrativo — cópia bloqueada)
                </span>
              )}
            </span>
            <button
              type="button"
              disabled={!isChallengeConfirmed}
              onClick={() => copyToClipboard(instruction.value, "value")}
              className={`text-xs inline-flex items-center gap-1 ${
                isChallengeConfirmed
                  ? "text-primary hover:underline cursor-pointer"
                  : "text-muted-foreground/50 cursor-not-allowed opacity-60"
              }`}
              title={
                isChallengeConfirmed
                  ? "Copiar valor do registro"
                  : "Cópia desabilitada: aguardando desafio oficial do backend."
              }
              aria-label="Copiar valor do registro DNS"
            >
              {copiedField === "value" ? (
                <Check size={12} className="text-emerald-500" />
              ) : (
                <Copy size={12} />
              )}
              <span>{copiedField === "value" ? "Copiado" : "Copiar"}</span>
            </button>
          </div>
          <div
            className={`font-mono text-xs break-all p-2 rounded ${
              isChallengeConfirmed
                ? "text-foreground select-all bg-muted/40"
                : "text-muted-foreground/80 italic bg-muted/20"
            }`}
          >
            {isChallengeConfirmed
              ? instruction.value
              : "plugpix-domain-verification=[aguardando_emissao_servidor]"}
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground">
          <ShieldAlert size={16} className="shrink-0 mt-0.5 text-primary" />
          <div className="space-y-1">
            <strong>Garantia de Segurança:</strong>
            <p>
              A comprovação de posse só ocorre quando o resolvedor DNS autoritativo do servidor ler
              o token exato na zona do domínio. Nenhuma confirmação pode ser enviada manualmente
              pelo navegador.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
