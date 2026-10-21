import React, { useState, useRef } from "react";
import { z } from "zod";
import { Sparkles, Globe, AlertCircle, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  domainReservationInputSchema,
  reservedDomainSchema,
} from "@/features/auth/domain-reservations";
import { suggestedWhiteLabelHosts } from "@/features/auth/white-label-hostnames";
import type { DomainEnvironment, ReservedDomain } from "./types";

interface DomainReservationFormProps {
  clinics: Array<{ id: string; name: string }>;
  selectedClinicId: string;
  token: string;
  onSuccess: (domain: ReservedDomain) => void;
  className?: string;
  disabled?: boolean;
}

export function DomainReservationForm({
  clinics,
  selectedClinicId,
  token,
  onSuccess,
  className = "",
  disabled = false,
}: DomainReservationFormProps) {
  const [clinicId, setClinicId] = useState(selectedClinicId);
  const [environment, setEnvironment] = useState<DomainEnvironment>("clinic_portal");
  const [hostname, setHostname] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const writing = useRef(false);

  // Sincronizar clínica se prop mudar e formulário estiver ocioso
  React.useEffect(() => {
    if (selectedClinicId && !writing.current) {
      setClinicId(selectedClinicId);
    }
  }, [selectedClinicId]);

  const handleSuggest = () => {
    const trimmed = slug.trim();
    const suggestion = suggestedWhiteLabelHosts(trimmed);
    if (!suggestion) {
      setError(
        "Use um identificador em minúsculas, com letras, números e hífens, sem nome reservado.",
      );
      return;
    }
    setError("");
    setNotice("");
    setHostname(suggestion[environment]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (writing.current || disabled) return;

    if (!clinicId) {
      setError("Selecione uma clínica para associar o domínio.");
      return;
    }

    const input = domainReservationInputSchema.safeParse({
      clinicId,
      hostname: hostname.trim().toLowerCase(),
      environment,
    });

    if (!input.success) {
      setError("Informe um hostname em minúsculas, sem protocolo, porta ou caminho.");
      return;
    }

    writing.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch("/api/platform/domains", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input.data),
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 409) {
          setError("Este hostname já está reservado.");
        } else if (response.status === 401 || response.status === 403) {
          setError("Acesso administrativo não autorizado.");
        } else {
          setError("Reserva não confirmada. Recarregue antes de tentar novamente.");
        }
        return;
      }

      const result = z
        .object({ domain: reservedDomainSchema })
        .strict()
        .parse(await response.json());

      if (
        result.domain.clinic_id !== clinicId ||
        result.domain.hostname !== input.data.hostname ||
        result.domain.environment !== environment
      ) {
        throw new Error("Reserva divergente do backend");
      }

      setHostname("");
      setSlug("");
      setNotice("Domínio reservado. Verificação de posse e HTTPS ainda pendentes.");
      onSuccess(result.domain as ReservedDomain);
    } catch {
      setError("Reserva não confirmada. Recarregue antes de tentar novamente.");
    } finally {
      clearTimeout(deadline);
      writing.current = false;
      setBusy(false);
    }
  };

  const isFormLocked = busy || disabled;

  return (
    <Card className={`border-border/60 bg-card/60 shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Globe size={18} />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Cadastrar Nova Reserva de Domínio
            </CardTitle>
            <CardDescription className="text-xs">
              Reserva administrativa para portal de gestão ou PWA do paciente.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Reservar domínio">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="clinic-select"
                className="text-xs font-medium text-foreground block mb-1.5"
              >
                Clínica Vinculada
              </label>
              <select
                id="clinic-select"
                aria-label="Clínica da reserva"
                value={clinicId}
                disabled={isFormLocked}
                onChange={(e) => {
                  setClinicId(e.target.value);
                  setError("");
                  setNotice("");
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                required
              >
                <option value="">Selecione uma clínica</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="env-select"
                className="text-xs font-medium text-foreground block mb-1.5"
              >
                Finalidade do Ambiente
              </label>
              <select
                id="env-select"
                aria-label="Finalidade da reserva"
                value={environment}
                disabled={isFormLocked}
                onChange={(e) => {
                  setEnvironment(
                    e.target.value === "patient_pwa" ? "patient_pwa" : "clinic_portal",
                  );
                  setError("");
                  setNotice("");
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
              >
                <option value="clinic_portal">Gestão e médico (Portal)</option>
                <option value="patient_pwa">PWA do paciente</option>
              </select>
            </div>
          </div>

          {/* Sugestão Rápida */}
          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Sparkles size={14} className="text-primary" />
              <span>Sugestão Automática de Hostname</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  id="suggestion-slug"
                  aria-label="Identificador para sugestão de domínio"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setError("");
                  }}
                  disabled={isFormLocked}
                  maxLength={63}
                  placeholder="slug-da-clinica (ex: viva-saude)"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFormLocked || !slug.trim()}
                onClick={handleSuggest}
                className="text-xs h-8 whitespace-nowrap"
              >
                Sugerir hostname
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              A sugestão usa o domínio base{" "}
              <strong className="text-foreground">techmedicina.com.br</strong>. Você também pode
              informar um domínio próprio ou subdomínio personalizado abaixo.
            </p>
          </div>

          {/* Hostname Manual */}
          <div>
            <label
              htmlFor="hostname-input"
              className="text-xs font-medium text-foreground block mb-1.5"
            >
              Hostname Completo FQDN
            </label>
            <Input
              id="hostname-input"
              aria-label="Hostname da reserva"
              value={hostname}
              onChange={(e) => {
                setHostname(e.target.value);
                setError("");
              }}
              disabled={isFormLocked}
              maxLength={253}
              placeholder="ex: gestao.suaclinica.com.br ou app.suaclinica.com.br"
              className="font-mono text-xs"
              required
            />
          </div>

          {/* Alertas */}
          {error && (
            <div
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2"
              role="alert"
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div
              className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2"
              role="status"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <span>{notice}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Shield size={12} className="text-primary" />
              <span>A reserva não ativa tráfego público antes da comprovação técnica.</span>
            </span>
            <Button
              type="submit"
              disabled={isFormLocked || !hostname.trim() || !clinicId}
              className="text-xs h-9 px-4 font-medium"
            >
              {busy ? "Reservando…" : "Reservar domínio"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
