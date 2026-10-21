import React, { useState } from "react";
import { Copy, Check, Info, ShieldAlert, Globe, Server } from "lucide-react";
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

  const copyToClipboard = async (text: string, fieldName: string) => {
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

  const fullInstructions = `Instruções de Apontamento DNS PlugPix Techmedicina:
Domínio: ${domain.hostname}
Tipo: ${instruction.type}
Nome / Entrada: ${instruction.name}
Valor / Conteúdo: ${instruction.value}
TTL sugerido: 300 segundos (ou 5 minutos)`;

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
                Para comprovação de posse do domínio{" "}
                <strong className="text-foreground">{domain.hostname}</strong>
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(fullInstructions, "all")}
            className="text-xs h-8 gap-1.5"
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
        <p className="text-muted-foreground text-xs leading-relaxed">
          Para que o portal seja ativado sob a marca da clínica, adicione um registro TXT na zona de
          DNS do domínio junto ao seu provedor (Cloudflare, Registro.br, AWS, etc.):
        </p>

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
            <span className="text-xs text-muted-foreground font-medium">Valor / Conteúdo TXT</span>
            <button
              type="button"
              onClick={() => copyToClipboard(instruction.value, "value")}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              title="Copiar valor do registro"
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
          <div className="font-mono text-xs break-all text-foreground select-all bg-muted/40 p-2 rounded">
            {instruction.value}
          </div>
        </div>

        {instruction.isTokenPending && (
          <div
            className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300"
            role="status"
          >
            <Info size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <strong>Aguardando emissão do desafio criptográfico:</strong> O token seguro de 256
              bits é gerado pelo orquestrador de segurança do servidor ao iniciar o ciclo de
              auditoria. Ao receber o token definitivo, o valor do registro TXT deve ser preenchido
              com a chave exata fornecida.
            </div>
          </div>
        )}

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/40 text-xs text-muted-foreground">
          <ShieldAlert size={16} className="shrink-0 mt-0.5 text-primary" />
          <div className="space-y-1">
            <strong>Segurança e propagação DNS:</strong>
            <p>
              A verificação é realizada exclusivamente por sondas criptográficas no servidor contra
              os servidores raiz/DNS do domínio. O navegador ou usuário não pode simular
              confirmação. A propagação do DNS pode levar de 5 minutos a algumas horas.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
