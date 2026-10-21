import React from "react";
import { Lock, ShieldCheck, AlertCircle, Server, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReservedDomain } from "./types";

interface DomainTlsCardProps {
  domain: ReservedDomain;
  className?: string;
}

export function DomainTlsCard({ domain, className = "" }: DomainTlsCardProps) {
  // A conformidade de TLS exige validação de transporte no servidor (D118) e prova assinada
  // Em conformidade com a diretriz: NUNCA simular TLS aprovado quando o backend não confirmou
  const isTlsConfirmed = false;

  return (
    <Card className={`border-border/60 bg-card/60 shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Lock size={18} />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Verificação HTTPS & Certificado TLS
            </CardTitle>
            <CardDescription className="text-xs">
              Segurança de transporte criptografado para{" "}
              <strong className="text-foreground">{domain.hostname}</strong>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        <div
          className={`p-3 rounded-lg border flex items-start gap-3 ${
            isTlsConfirmed
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-muted/40 border-border/60 text-muted-foreground"
          }`}
          role="status"
        >
          {isTlsConfirmed ? (
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-semibold text-foreground text-xs">
              {isTlsConfirmed
                ? "Transporte HTTPS e Certificado Homologados"
                : "Transporte HTTPS Pendente de Validação"}
            </div>
            <p className="text-xs leading-relaxed">
              {isTlsConfirmed
                ? "O tráfego seguro está validado e o certificado TLS atende às políticas de segurança."
                : "A sonda de transporte HTTPS e conferência do certificado SSL/TLS ainda não foram concluídas pelo backend. A interface não declara aprovação prévia."}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Critérios do Ciclo de Segurança TLS:
          </span>
          <ul className="grid gap-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2 p-2 rounded border border-border/40 bg-background/40">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>
                <strong>1. Apontamento A/CNAME:</strong> O hostname deve resolver para os IPs
                públicos do gateway Techmedicina (rejeita redes locais e privadas).
              </span>
            </li>
            <li className="flex items-center gap-2 p-2 rounded border border-border/40 bg-background/40">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>
                <strong>2. Certificado SNI:</strong> Certificado válido emitido para o hostname
                exato, sem erros de cadeia ou expiração.
              </span>
            </li>
            <li className="flex items-center gap-2 p-2 rounded border border-border/40 bg-background/40">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>
                <strong>3. Sonda de Roteamento:</strong> Resposta bem-sucedida em{" "}
                <code className="text-primary font-mono text-[11px]">
                  /.well-known/plugpix-routing
                </code>{" "}
                com prova criptográfica assinada.
              </span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
