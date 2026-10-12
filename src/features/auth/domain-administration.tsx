import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { domainReservationInputSchema, reservedDomainSchema } from "./domain-reservations";
import type { ClinicDirectory } from "./clinic-directory";
import { suggestedWhiteLabelHosts } from "./white-label-hostnames";
import { DomainAuditPanel } from "./domain-audit-panel";
const directorySchema = z
  .object({
    domains: z.array(reservedDomainSchema).max(100),
    hasMore: z.boolean(),
    nextCursor: domainReservationInputSchema.shape.hostname.nullable(),
  })
  .strict()
  .refine((value) =>
    value.hasMore
      ? value.domains.length === 100 && value.nextCursor === value.domains.at(-1)?.hostname
      : value.nextCursor === null,
  );
type Directory = z.infer<typeof directorySchema>;
export function DomainAdministration({
  token,
  clinics,
}: {
  token: string;
  clinics: ClinicDirectory["clinics"];
}) {
  const [clinicId, setClinicId] = useState(clinics[0]?.id ?? "");
  const [hostname, setHostname] = useState("");
  const [slug, setSlug] = useState("");
  const [environment, setEnvironment] = useState<"clinic_portal" | "patient_pwa">("clinic_portal");
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [after, setAfter] = useState("");
  const [auditDomainId, setAuditDomainId] = useState("");
  const mounted = useRef(false);
  const writing = useRef(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 20_000);
    abort.current = controller;
    setDirectory(null);
    setAuditDomainId("");
    setError("");
    if (!clinicId) {
      clearTimeout(deadline);
      return () => controller.abort();
    }
    void (async () => {
      try {
        const response = await fetch(
          `/api/platform/domains?clinicId=${encodeURIComponent(clinicId)}${after ? `&after=${encodeURIComponent(after)}` : ""}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok)
          throw new Error(
            "Não foi possível confirmar as reservas. Confira o acesso e tente recarregar.",
          );
        const result = directorySchema.parse(await response.json());
        if (result.domains.some((domain) => domain.clinic_id !== clinicId))
          throw new Error("Resposta incompatível com a clínica.");
        if (!controller.signal.aborted) setDirectory(result);
      } catch {
        if (abort.current === controller && mounted.current)
          setError("Não foi possível carregar as reservas desta clínica.");
      } finally {
        clearTimeout(deadline);
      }
    })();
    return () => {
      clearTimeout(deadline);
      controller.abort();
    };
  }, [token, clinicId, reload, after]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (writing.current || !directory) return;
    const input = domainReservationInputSchema.safeParse({ clinicId, hostname, environment });
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
    abort.current = controller;
    try {
      const response = await fetch("/api/platform/domains", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(input.data),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!mounted.current) return;
      if (!response.ok) {
        if (response.status !== 409) setDirectory(null);
        setError(
          response.status === 409
            ? "Este hostname já está reservado."
            : "Reserva não confirmada. Recarregue antes de tentar novamente.",
        );
        return;
      }
      const result = z
        .object({ domain: reservedDomainSchema })
        .strict()
        .parse(await response.json());
      if (
        result.domain.clinic_id !== clinicId ||
        result.domain.hostname !== hostname ||
        result.domain.environment !== environment
      )
        throw new Error("Reservation mismatch");
      if (!mounted.current) return;
      setDirectory(null);
      setAfter("");
      setReload((value) => value + 1);
      setHostname("");
      setNotice("Domínio reservado. Verificação de posse e HTTPS ainda pendentes.");
    } catch {
      if (mounted.current) {
        setDirectory(null);
        setError("Reserva não confirmada. Recarregue antes de tentar novamente.");
      }
    } finally {
      clearTimeout(deadline);
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section
      aria-label="Reservas de domínios"
      className="mt-6 space-y-4 rounded-xl border border-border bg-background/40 p-4"
    >
      <h3 className="font-semibold">Domínios White Label</h3>
      <p className="text-sm text-muted-foreground">
        Reservas administrativas. Não ativam DNS, certificados ou acesso aos portais.
      </p>
      <label className="block">
        Clínica
        <select
          aria-label="Clínica da reserva"
          value={clinicId}
          disabled={busy}
          onChange={(event) => {
            setDirectory(null);
            setAfter("");
            setNotice("");
            setHostname("");
            setSlug("");
            setClinicId(event.target.value);
          }}
          className="login-input w-full"
        >
          <option value="">Selecione uma clínica</option>
          {clinics.map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="button"
        variant="outline"
        disabled={busy || !clinicId}
        onClick={() => {
          setDirectory(null);
          setAfter("");
          setNotice("");
          setReload((value) => value + 1);
        }}
      >
        Recarregar reservas
      </Button>
      {directory && (
        <ul>
          {directory.domains.map((domain) => (
            <li key={domain.id} className="break-all py-2">
              {domain.hostname} ·{" "}
              {domain.environment === "patient_pwa" ? "PWA do paciente" : "Gestão e médico"} ·
              Pendente de verificação
              <Button
                type="button"
                variant="outline"
                className="ml-2"
                disabled={busy}
                onClick={() => setAuditDomainId(domain.id)}
                aria-label={`Ver auditoria de ${domain.hostname}`}
              >
                Auditoria
              </Button>
            </li>
          ))}
        </ul>
      )}
      {directory?.domains.length === 0 && <p>Nenhum domínio reservado nesta clínica.</p>}
      {after && (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setDirectory(null);
            setAfter("");
            setNotice("");
          }}
        >
          Primeira página de reservas
        </Button>
      )}
      {directory?.hasMore && (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setDirectory(null);
            setAfter(directory.nextCursor ?? "");
            setNotice("");
          }}
        >
          Próxima página de reservas
        </Button>
      )}
      <form onSubmit={submit} className="space-y-3" aria-label="Reservar domínio">
        <label className="block">
          Identificador para sugestão
          <Input
            aria-label="Identificador para sugestão de domínio"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            disabled={busy}
            maxLength={63}
            placeholder="minha-clinica"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !directory}
          onClick={() => {
            const suggestion = suggestedWhiteLabelHosts(slug);
            if (!suggestion) {
              setError(
                "Use um identificador em minúsculas, com letras, números e hífens, sem nome reservado.",
              );
              return;
            }
            setError("");
            setNotice("");
            setHostname(suggestion[environment]);
          }}
        >
          Sugerir hostname
        </Button>
        <p className="text-xs text-muted-foreground">
          A sugestão usa techmedicina.com.br. Você também pode informar um domínio próprio abaixo.
          Ambos exigem verificação antes da ativação.
        </p>
        <label className="block">
          Hostname
          <Input
            aria-label="Hostname da reserva"
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            disabled={busy}
            maxLength={253}
            placeholder="gestao.suaclinica.com.br"
            required
          />
        </label>
        <label className="block">
          Finalidade
          <select
            aria-label="Finalidade da reserva"
            value={environment}
            disabled={busy}
            onChange={(event) =>
              setEnvironment(event.target.value === "patient_pwa" ? "patient_pwa" : "clinic_portal")
            }
            className="login-input w-full"
          >
            <option value="clinic_portal">Gestão e médico</option>
            <option value="patient_pwa">PWA do paciente</option>
          </select>
        </label>
        <Button type="submit" disabled={busy || !directory}>
          {busy ? "Reservando…" : "Reservar domínio"}
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {directory?.domains.some((domain) => domain.id === auditDomainId) && (
        <DomainAuditPanel
          key={`${clinicId}:${auditDomainId}:${token}`}
          token={token}
          clinicId={clinicId}
          domainId={auditDomainId}
        />
      )}
    </section>
  );
}
