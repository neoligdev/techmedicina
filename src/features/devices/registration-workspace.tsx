import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { deviceRegistrationDocumentSchema } from "./registration-contract";
import { createDeviceRegistrationClient, DeviceRegistrationConflict } from "./registration-client";
async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
export function DeviceRegistrationWorkspace() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let active = true,
      version = 0;
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (active && version === 0) setUserId(error ? null : (data.user?.id ?? null));
      })
      .catch(() => {
        if (active && version === 0) setUserId(null);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        version++;
        setUserId(session?.user.id ?? null);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return (
    <section className="page-content">
      <Card>
        <CardHeader>
          <CardTitle>Cadastro administrativo de unidades</CardTitle>
          <CardDescription>
            Registre metadados informados de cada unidade. Este rascunho não libera integração ou
            pareamento e não comprova autenticidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userId ? (
            <DeviceRegistrationEditor key={userId} getAccessToken={token} />
          ) : (
            <p>Entre com sua conta para acessar a edição. O servidor exige Super ADM ativo.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
const empty = () =>
  deviceRegistrationDocumentSchema.parse({ title: "Nova unidade — cadastro em rascunho" });
export function DeviceRegistrationEditor({
  getAccessToken,
  fetcher,
}: {
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}) {
  const client = useMemo(
    () => createDeviceRegistrationClient(getAccessToken, fetcher),
    [getAccessToken, fetcher],
  );
  const [id, setId] = useState<string>(),
    [openId, setOpenId] = useState(""),
    [revision, setRevision] = useState(0),
    [document, setDocument] = useState(empty);
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [dirty, setDirty] = useState(false),
    [message, setMessage] = useState("");
  const active = useRef(true),
    pending = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  function create() {
    if (pending.current || dirty || uncertain) return;
    setId(crypto.randomUUID());
    setRevision(0);
    setDocument(empty());
    setDirty(true);
    setMessage("Rascunho em edição, ainda não salvo.");
  }
  async function load(target: string, recovery = false) {
    if (pending.current || (!recovery && (dirty || uncertain))) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const saved = await client.read(target);
      if (!active.current) return;
      if (!saved) {
        setMessage("Cadastro não encontrado.");
        return;
      }
      setId(saved.id);
      setDocument(saved.document);
      setRevision(saved.revision);
      setDirty(false);
      setUncertain(false);
      setMessage("Versão confirmada carregada.");
    } catch {
      if (active.current)
        setMessage(
          "Não foi possível carregar. Confira seu acesso e a disponibilidade do cadastro.",
        );
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function save() {
    if (!id || pending.current || uncertain || !dirty) return;
    const input = deviceRegistrationDocumentSchema.safeParse(document);
    if (!input.success) {
      setMessage("Confira a identificação e os limites dos campos.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const saved = await client.save({ id, expectedRevision: revision, document: input.data });
      if (!active.current) return;
      if (!saved) throw new Error("Unconfirmed");
      setRevision(saved.revision);
      setDocument(saved.document);
      setDirty(false);
      setMessage("Cadastro salvo e confirmado no servidor, sem liberação da integração.");
    } catch (error) {
      if (active.current) {
        setUncertain(true);
        setMessage(
          error instanceof DeviceRegistrationConflict
            ? "O rascunho mudou. Recarregue a versão confirmada antes de editar."
            : "Não foi possível confirmar o salvamento. Recarregue para conferir a versão do servidor.",
        );
      }
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  }
  const editable = Boolean(id) && !busy && !uncertain;
  return (
    <div className="space-y-5" aria-busy={busy}>
      <div className="flex flex-wrap gap-3">
        <Button onClick={create} disabled={busy || dirty || uncertain}>
          Novo cadastro de unidade
        </Button>
        <label className="flex gap-2 items-center">
          <span>Identificador do cadastro</span>
          <Input
            value={openId}
            onChange={(e) => setOpenId(e.target.value)}
            disabled={busy || dirty || uncertain}
          />
        </label>
        <Button
          variant="outline"
          disabled={busy || dirty || uncertain || !openId}
          onClick={() => void load(openId)}
        >
          Abrir cadastro
        </Button>
      </div>
      {id && (
        <>
          <p className="text-sm text-muted-foreground">
            ID: <code>{id}</code> ·{" "}
            {revision > 0 ? `Revisão confirmada ${revision}` : "Ainda não salvo"}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                "title",
                "manufacturer",
                "model",
                "claimedIdentifier",
                "firmwareVersion",
                "lot",
              ] as const
            ).map((key) => (
              <label key={key} className="space-y-2">
                <span>
                  {
                    {
                      title: "Identificação administrativa",
                      manufacturer: "Fabricante informado",
                      model: "Modelo informado",
                      claimedIdentifier: "Identificador informado da unidade",
                      firmwareVersion: "Versão de firmware informada",
                      lot: "Lote informado",
                    }[key]
                  }
                </span>
                <Input
                  value={document[key]}
                  disabled={!editable}
                  onChange={(e) => {
                    setDocument((v) => ({ ...v, [key]: e.target.value }));
                    setDirty(true);
                  }}
                />
              </label>
            ))}
          </div>
          <label className="block space-y-2">
            <span>Observações do cadastro</span>
            <Textarea
              value={document.notes}
              rows={10}
              disabled={!editable}
              onChange={(e) => {
                setDocument((v) => ({ ...v, notes: e.target.value }));
                setDirty(true);
              }}
            />
          </label>
          <div className="flex gap-3">
            <Button disabled={!editable || !dirty} onClick={() => void save()}>
              Salvar cadastro
            </Button>
            {uncertain && (
              <Button variant="outline" disabled={busy} onClick={() => void load(id, true)}>
                Recarregar versão do servidor
              </Button>
            )}
          </div>
          <article
            aria-label="Prévia dos metadados informados"
            className="rounded-xl border border-border bg-card/60 p-5"
          >
            <h3 className="font-semibold">{document.title}</h3>
            <p>
              {document.manufacturer} {document.model}
            </p>
            <p className="whitespace-pre-wrap mt-3">{document.notes}</p>
          </article>
        </>
      )}
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Dados informados não são medições nem prova de autenticidade. Liberação central, verificação
        física, estoque, expedição, vínculo ao paciente e sincronização ainda não estão habilitados.
        Alterações não salvas ficam apenas nesta tela.
      </p>
    </div>
  );
}
