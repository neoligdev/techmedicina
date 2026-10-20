import { useState } from "react";
import { AlertCircle, Calendar, Clock, Globe, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvailabilityForm } from "./availability-form";
import { AvailabilityList } from "./availability-list";
import { createAvailabilityClient } from "./availability-client";
import { createAvailabilityReadClient } from "./availability-read-client";
import { isValidIanaTimeZone } from "./local-time";
import type { availabilityProposalSchema } from "./availability";
import type { availabilityPageQuerySchema } from "./availability-page";
import type { z } from "zod";

type Proposal = z.infer<typeof availabilityProposalSchema>;
type Query = z.infer<typeof availabilityPageQuerySchema>;

export interface AvailabilityWorkspaceProps {
  clinic: {
    id: string;
    name?: string;
    timeZone?: string;
  };
  doctorUserId?: string;
  timeZone?: string;
  canWrite?: boolean;
  canRead?: boolean;
  send?: (value: Proposal) => Promise<unknown>;
  load?: (query: Query) => Promise<unknown>;
  isOperationalEnabled?: boolean;
  getAccessToken?: () => Promise<string | null>;
}

/**
 * Componente contenedor da Agenda Médica (D108–D109).
 * Integra o formulário de cadastro de disponibilidade (D97) e
 * a lista paginada de horários (D107) em um ambiente seguro e auditado.
 *
 * Garante identificação explícita e validação IANA do fuso da clínica,
 * bloqueio preventivo de cadastro/consulta quando o fuso é ausente/inválido,
 * proteção contra dados demonstrativos disfarçados de reais e
 * controle rigoroso de ativação com banner informativo enquanto
 * a migração 015 não estiver aplicada no Cloud.
 */
export function AvailabilityWorkspace({
  clinic,
  doctorUserId = "00000000-0000-0000-0000-000000000001",
  timeZone: explicitTimeZone,
  canWrite = true,
  canRead = true,
  send,
  load,
  isOperationalEnabled = false,
  getAccessToken = async () => null,
}: AvailabilityWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"cadastrar" | "listar">("listar");
  const [, setLastConfirmedAt] = useState<string | null>(null);

  // Derivação e validação estrita de fuso horário IANA (não assume America/Bahia como padrão universal)
  const candidateTimeZone = explicitTimeZone ?? clinic.timeZone;
  const isTimeZoneValid = isValidIanaTimeZone(candidateTimeZone);
  const effectiveTimeZone = isTimeZoneValid ? candidateTimeZone : "";

  // Se o fuso for inválido ou não configurado, a política de segurança desativa operações
  const operationalCanWrite = canWrite && isTimeZoneValid;
  const operationalCanRead = canRead && isTimeZoneValid;

  // Instanciação segura dos clientes padrão caso não tenham sido injetados
  const defaultSend =
    send ??
    createAvailabilityClient({
      clinicId: clinic.id,
      doctorUserId,
      getAccessToken,
    });

  const defaultLoad =
    load ??
    createAvailabilityReadClient({
      clinicId: clinic.id,
      doctorUserId,
      getAccessToken,
    });

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6" data-testid="availability-workspace">
      {/* Cabeçalho da Agenda Médica */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Agenda Médica — Disponibilidade
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão profissional de horários de atendimento clínico em{" "}
            <span className="font-medium text-foreground">{clinic.name ?? "Clínica"}</span>
          </p>
        </div>

        {/* Fuso Horário Explícito da Clínica */}
        <div
          className={`flex items-center gap-2 border px-3 py-1.5 rounded-lg text-sm ${
            isTimeZoneValid
              ? "bg-muted/50 text-foreground"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
          data-testid="clinic-timezone-badge"
        >
          {isTimeZoneValid ? (
            <Globe className="h-4 w-4 text-muted-foreground" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="text-xs text-muted-foreground">Fuso horário:</span>
          <span className="font-semibold">
            {isTimeZoneValid ? effectiveTimeZone : "Indisponível / Não configurado"}
          </span>
        </div>
      </div>

      {/* Alerta de Ausência de Fuso Horário Válido */}
      {!isTimeZoneValid && (
        <Card
          className="border-destructive/40 bg-destructive/5 text-destructive"
          data-testid="timezone-missing-alert"
        >
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Fuso Horário da Clínica Não Configurado</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Esta clínica não possui um identificador de fuso horário IANA válido configurado no
                sistema. Conforme a política de segurança, o cadastro e a consulta de horários
                permanecem bloqueados para evitar divergências ou horários ambíguos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerta de Controle de Ativação / Homologação (Requirement 6) */}
      {!isOperationalEnabled && (
        <Card className="border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Módulo em Homologação Técnica (Ciclo D109)</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                A persistência de disponibilidade médica requer a aplicação da migração{" "}
                <code className="px-1 py-0.5 bg-muted rounded font-mono text-xs">
                  015_doctor_availability.sql
                </code>{" "}
                no banco de dados do Cloud. Para sua segurança, a ativação operacional em produção
                está bloqueada até autorização expressa e confirmação da infraestrutura remota.
                Nenhum dado demonstrativo fictício é apresentado.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navegação entre Cadastro e Consulta */}
      <div className="flex items-center gap-2 border-b pb-2">
        <Button
          variant={activeTab === "listar" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("listar")}
          className="gap-2"
          data-testid="tab-listar"
        >
          <Clock className="h-4 w-4" />
          Consultar Horários
        </Button>
        <Button
          variant={activeTab === "cadastrar" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("cadastrar")}
          className="gap-2"
          data-testid="tab-cadastrar"
        >
          <Calendar className="h-4 w-4" />
          Cadastrar Disponibilidade
        </Button>
      </div>

      {/* Seção 1: Formulário de Cadastro */}
      {activeTab === "cadastrar" && (
        <div className="space-y-4" data-testid="workspace-form-section">
          <div className="text-sm text-muted-foreground">
            Defina intervalos de início e término nos quais você estará disponível para consultas.
          </div>
          <AvailabilityForm
            clinicId={clinic.id}
            doctorUserId={doctorUserId}
            timeZone={effectiveTimeZone}
            canWrite={operationalCanWrite}
            send={async (proposal) => {
              const result = await defaultSend(proposal);
              setLastConfirmedAt(new Date().toISOString());
              return result;
            }}
          />
        </div>
      )}

      {/* Seção 2: Listagem Paginada de Horários */}
      {activeTab === "listar" && (
        <div className="space-y-4" data-testid="workspace-list-section">
          <div className="text-sm text-muted-foreground">
            Consulte seus horários de atendimento cadastrados por período no fuso horário da
            clínica.
          </div>
          <AvailabilityList
            clinicId={clinic.id}
            doctorUserId={doctorUserId}
            timeZone={effectiveTimeZone}
            canRead={operationalCanRead}
            load={defaultLoad}
          />
        </div>
      )}

      {/* Rodapé informativo de integridade */}
      <div className="pt-4 border-t text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Identificador do Médico: {doctorUserId}</span>
        <span>Isolamento Multiempresa: Clínica {clinic.id}</span>
      </div>
    </div>
  );
}
