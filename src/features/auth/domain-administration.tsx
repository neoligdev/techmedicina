import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { domainReservationInputSchema, reservedDomainSchema } from "./domain-reservations";
import type { ClinicDirectory } from "./clinic-directory";
const directorySchema = z
  .object({ domains: z.array(reservedDomainSchema).max(100), hasMore: z.boolean() })
  .strict();
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
  const [environment, setEnvironment] = useState<"clinic_portal" | "patient_pwa">("clinic_portal");
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
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
    abort.current = controller;
    setDirectory(null);
    setError("");
    setNotice("");
    if (!clinicId) return () => controller.abort();
    void (async () => {
      try {
        const response = await fetch(
          `/api/platform/domains?clinicId=${encodeURIComponent(clinicId)}`,
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
        if (!controller.signal.aborted)
          setError("Não foi possível carregar as reservas desta clínica.");
      }
    })();
    return () => controller.abort();
  }, [token, clinicId, reload]);
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
      setDirectory((current) =>
        current
          ? {
              ...current,
              domains: [result.domain, ...current.domains].slice(0, 100),
              hasMore: current.hasMore || current.domains.length >= 100,
            }
          : null,
      );
      setHostname("");
      setNotice("Domínio reservado. Verificação de posse e HTTPS ainda pendentes.");
    } catch {
      if (mounted.current)
        setError("Reserva não confirmada. Recarregue antes de tentar novamente.");
    } finally {
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
          onChange={(event) => setClinicId(event.target.value)}
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
        onClick={() => setReload((value) => value + 1)}
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
            </li>
          ))}
        </ul>
      )}
      {directory?.domains.length === 0 && <p>Nenhum domínio reservado nesta clínica.</p>}
      {directory?.hasMore && (
        <p>
          Exibidos até cem registros. Há mais reservas; consulta de páginas anteriores ainda
          pendente.
        </p>
      )}
      <form onSubmit={submit} className="space-y-3" aria-label="Reservar domínio">
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
    </section>
  );
}
