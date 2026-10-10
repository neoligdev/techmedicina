import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savedClinicSchema } from "./clinic-write";
import type { z } from "zod";
import type { ClinicDirectory } from "./clinic-directory";

class AdministrativeUiError extends Error {}

type SavedClinic = z.infer<typeof savedClinicSchema>;
type Props = {
  token: string;
  clinics: ClinicDirectory["clinics"];
  onSaved: (clinic: SavedClinic) => void;
};

export function ClinicAdministration({ token, clinics, onSaved }: Props) {
  const [editing, setEditing] = useState<SavedClinic | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const running = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);

  function failure(status: number) {
    return status === 409
      ? "A clínica foi alterada. Abra a edição novamente para carregar a versão atual."
      : status === 401 || status === 403
        ? "O acesso administrativo mudou. Entre novamente."
        : status === 400
          ? "Confira o nome e os dados da clínica."
          : "Não foi possível confirmar a operação. Recarregue o cadastro antes de tentar novamente.";
  }

  async function edit(id: string) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    setOpen(false);
    setEditing(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch(`/api/platform/clinic?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new AdministrativeUiError(failure(response.status));
      const data: unknown = await response.json();
      const parsed = savedClinicSchema.safeParse(
        data && typeof data === "object" && "clinic" in data ? data.clinic : null,
      );
      if (!parsed.success || parsed.data.id !== id) throw new AdministrativeUiError(failure(503));
      if (!mounted.current || controller.signal.aborted) return;
      setEditing(parsed.data);
      setName(parsed.data.name);
      setActive(parsed.data.is_active);
      setOpen(true);
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted)
        setError(cause instanceof AdministrativeUiError ? cause.message : failure(503));
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (running.current) return;
    if (name.trim().length < 2 || name.trim().length > 160) {
      setError("Informe um nome entre 2 e 160 caracteres.");
      return;
    }
    running.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const payload = editing
        ? {
            operation: "update",
            id: editing.id,
            expectedRevision: editing.revision,
            name: name.trim(),
            isActive: active,
          }
        : { operation: "create", name: name.trim(), isActive: active };
      const response = await fetch("/api/platform/clinics", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.status !== (editing ? 200 : 201))
        throw new AdministrativeUiError(failure(response.status));
      const data: unknown = await response.json();
      const parsed = savedClinicSchema.safeParse(
        data && typeof data === "object" && "clinic" in data ? data.clinic : null,
      );
      if (!parsed.success || (editing && parsed.data.id !== editing.id))
        throw new AdministrativeUiError(failure(503));
      if (!mounted.current || controller.signal.aborted) return;
      onSaved(parsed.data);
      setNotice(
        editing
          ? "Clínica atualizada com auditoria registrada."
          : "Clínica criada com auditoria registrada.",
      );
      setOpen(false);
      setEditing(null);
      setName("");
      setActive(false);
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted)
        setError(cause instanceof AdministrativeUiError ? cause.message : failure(503));
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        disabled={busy}
        onClick={() => {
          setOpen(true);
          setEditing(null);
          setName("");
          setActive(false);
          setError(null);
          setNotice(null);
        }}
      >
        Nova clínica
      </Button>
      {clinics.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma clínica cadastrada no banco.</p>
      ) : (
        <ul className="space-y-3">
          {clinics.map((clinic) => (
            <li key={clinic.id} className="rounded-xl border border-border bg-background/40 p-4">
              <span className="block font-medium break-words">{clinic.name}</span>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {clinic.is_active ? "Ativa" : "Inativa"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  aria-label={`Editar ${clinic.name}`}
                  onClick={() => void edit(clinic.id)}
                >
                  Editar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border border-border bg-background/40 p-4"
          aria-label={editing ? "Editar clínica" : "Criar clínica"}
          aria-busy={busy}
        >
          <h4 className="font-semibold">{editing ? "Editar clínica" : "Criar clínica"}</h4>
          <Label htmlFor="clinic-real-name">Nome da clínica</Label>
          <Input
            id="clinic-real-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={160}
            disabled={busy}
            className="login-input"
          />
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              disabled={busy}
            />
            Clínica ativa
          </label>
          <p className="text-xs text-muted-foreground">
            Contas, vínculos e módulos são configurados em etapas próprias.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Salvando…" : "Salvar clínica"}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
              Fechar formulário
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
    </div>
  );
}
