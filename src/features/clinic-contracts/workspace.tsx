import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ClinicContractHistory } from "./history";
import { ClinicContractLibrary } from "./library";
import { ContractClinicChoice } from "./clinic-choice";
import { emptyClinicContract, clinicContractDocumentSchema } from "./contracts";
import { createClinicContractClient, ClinicContractConflict } from "./draft-client";
import { parseDraftMoney, formatDraftMoney } from "./money";
async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
export function ClinicContractWorkspace() {
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
          <CardTitle>Contrato de uso da clínica</CardTitle>
          <CardDescription>
            Propostas comerciais entre a clínica e a PlugPix. Salvar um rascunho não representa
            aceite, cobrança ou ativação de serviços.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userId ? (
            <ClinicContractEditor key={userId} getAccessToken={token} />
          ) : (
            <p>Entre com sua conta para acessar a edição. O servidor exige Super ADM ativo.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

type Document = z.infer<typeof clinicContractDocumentSchema>;
const moneyFields = {
  setupCents: "Setup de implementação (R$)",
  monthlyCents: "Mensalidade (R$)",
  holderCents: "Preço por titular (R$)",
  dependentCents: "Preço por dependente (R$)",
} as const;
type MoneyKey = keyof typeof moneyFields;
type Form = Omit<Document, MoneyKey | "livesCount"> &
  Record<MoneyKey, string> & { livesCount: string };
function formOf(doc: Document): Form {
  return {
    ...doc,
    setupCents: formatDraftMoney(doc.setupCents),
    monthlyCents: formatDraftMoney(doc.monthlyCents),
    holderCents: formatDraftMoney(doc.holderCents),
    dependentCents: formatDraftMoney(doc.dependentCents),
    livesCount: doc.livesCount === null ? "" : String(doc.livesCount),
  };
}
function documentOf(form: Form): Document {
  if (form.livesCount !== "" && !/^(0|[1-9][0-9]{0,9})$/.test(form.livesCount))
    throw new Error("Invalid count");
  return clinicContractDocumentSchema.parse({
    ...form,
    setupCents: parseDraftMoney(form.setupCents),
    monthlyCents: parseDraftMoney(form.monthlyCents),
    holderCents: parseDraftMoney(form.holderCents),
    dependentCents: parseDraftMoney(form.dependentCents),
    livesCount: form.livesCount === "" ? null : Number(form.livesCount),
  });
}
export function ClinicContractEditor({
  getAccessToken,
  fetcher,
}: {
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}) {
  const client = useMemo(
    () => createClinicContractClient(getAccessToken, fetcher),
    [getAccessToken, fetcher],
  );
  const [clinicId, setClinicId] = useState(""),
    [id, setId] = useState<string>(),
    [openId, setOpenId] = useState(""),
    [revision, setRevision] = useState(0),
    [form, setForm] = useState(() => formOf(emptyClinicContract()));
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [confirmDiscard, setConfirmDiscard] = useState(false),
    [message, setMessage] = useState("");
  const [libraryRevision, setLibraryRevision] = useState(0);
  const active = useRef(true),
    pending = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  function selectClinic(target: string) {
    if (pending.current || dirty || uncertain) return;
    setClinicId(target);
    setId(undefined);
    setRevision(0);
    setForm(formOf(emptyClinicContract()));
    setMessage("");
    setOpenId("");
  }
  function create() {
    if (!clinicId || pending.current || dirty || uncertain) return;
    setId(crypto.randomUUID());
    setRevision(0);
    setForm(formOf(emptyClinicContract()));
    setDirty(true);
    setMessage("Rascunho comercial ainda não salvo.");
  }
  async function load(target: string, recovery = false) {
    if (!clinicId || pending.current || (!recovery && (dirty || uncertain))) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const saved = await client.read({ id: target, clinicId });
      if (!active.current) return;
      if (!saved) {
        setMessage("Rascunho não encontrado nesta clínica.");
        return;
      }
      setId(saved.id);
      setRevision(saved.revision);
      setForm(formOf(saved.document));
      setDirty(false);
      setUncertain(false);
      setConfirmDiscard(false);
      setMessage("Versão comercial confirmada carregada.");
    } catch {
      if (active.current)
        setMessage("Não foi possível consultar o rascunho. Confira acesso e disponibilidade.");
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function save() {
    if (!id || !clinicId || pending.current || uncertain || !dirty) return;
    let document: Document;
    try {
      document = documentOf(form);
    } catch {
      setMessage(
        "Confira título, quantidades e valores. Use até duas casas decimais e deixe em branco o que ainda não foi definido.",
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const saved = await client.save({ id, clinicId, expectedRevision: revision, document });
      if (!active.current) return;
      if (!saved) throw new Error("Unconfirmed");
      setRevision(saved.revision);
      setForm(formOf(saved.document));
      setDirty(false);
      setMessage("Rascunho comercial salvo e confirmado no servidor.");
      setLibraryRevision((v) => v + 1);
    } catch (error) {
      if (active.current) {
        setUncertain(true);
        setMessage(
          error instanceof ClinicContractConflict
            ? "O contrato mudou. Recarregue antes de editar."
            : "Não foi possível confirmar o salvamento. Recarregue para conferir o servidor.",
        );
      }
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  }
  function change<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setConfirmDiscard(false);
  }
  const editable = Boolean(id) && !busy && !uncertain;
  return (
    <div className="space-y-5" aria-busy={busy}>
      <ContractClinicChoice
        value={clinicId}
        onSelect={selectClinic}
        disabled={busy || dirty || uncertain}
        getAccessToken={getAccessToken}
        {...(fetcher ? { fetcher } : {})}
      />
      {clinicId && (
        <p className="text-sm text-muted-foreground">
          Clínica selecionada: <code>{clinicId}</code>
        </p>
      )}
      {clinicId && (
        <ClinicContractLibrary
          key={clinicId}
          clinicId={clinicId}
          getAccessToken={getAccessToken}
          {...(fetcher ? { fetcher } : {})}
          disabled={busy || dirty || uncertain}
          onOpen={(target) => void load(target)}
          refreshKey={libraryRevision}
        />
      )}
      <div className="flex flex-wrap gap-3">
        <Button disabled={!clinicId || busy || dirty || uncertain} onClick={create}>
          Novo rascunho de contrato
        </Button>
        <label>
          <span>Identificador do rascunho comercial</span>
          <Input
            value={openId}
            disabled={!clinicId || busy || dirty || uncertain}
            onChange={(e) => setOpenId(e.target.value)}
          />
        </label>
        <Button
          variant="outline"
          disabled={!clinicId || !openId || busy || dirty || uncertain}
          onClick={() => void load(openId)}
        >
          Abrir contrato
        </Button>
      </div>
      {id && (
        <>
          <p className="text-sm text-muted-foreground">
            ID: <code>{id}</code> ·{" "}
            {revision ? "Revisão confirmada " + revision : "Ainda não salvo"} · Rascunho
          </p>
          <label className="block space-y-2">
            <span>Nome da proposta</span>
            <Input
              value={form.title}
              maxLength={160}
              disabled={!editable}
              onChange={(e) => change("title", e.target.value)}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            {(Object.keys(moneyFields) as MoneyKey[]).map((key) => (
              <label key={key} className="space-y-2">
                <span>{moneyFields[key]}</span>
                <Input
                  inputMode="decimal"
                  placeholder="Não definido"
                  value={form[key]}
                  disabled={!editable}
                  onChange={(e) => change(key, e.target.value)}
                />
              </label>
            ))}
            {(["monthlyEnabled", "livesEnabled"] as const).map((key) => (
              <label key={key} className="space-y-2">
                <span>
                  {key === "monthlyEnabled" ? "Existe mensalidade?" : "Existe cobrança por vidas?"}
                </span>
                <select
                  className="w-full rounded-lg border border-input bg-background p-3"
                  disabled={!editable}
                  value={form[key] === null ? "undecided" : String(form[key])}
                  onChange={(e) =>
                    change(key, e.target.value === "undecided" ? null : e.target.value === "true")
                  }
                >
                  <option value="undecided">Não definido</option>
                  <option value="true">Sim, em proposta</option>
                  <option value="false">Não, em proposta</option>
                </select>
              </label>
            ))}
            <label className="space-y-2">
              <span>Quantidade de vidas em proposta</span>
              <Input
                inputMode="numeric"
                placeholder="Não definido"
                value={form.livesCount}
                disabled={!editable}
                onChange={(e) => change("livesCount", e.target.value)}
              />
            </label>
          </div>
          <label className="block space-y-2">
            <span>Observações comerciais</span>
            <Textarea
              rows={5}
              maxLength={4000}
              value={form.notes}
              disabled={!editable}
              onChange={(e) => change("notes", e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button disabled={!editable || !dirty} onClick={() => void save()}>
              Salvar rascunho comercial
            </Button>
            {uncertain && (
              <Button variant="outline" disabled={busy} onClick={() => void load(id, true)}>
                Recarregar contrato do servidor
              </Button>
            )}
            {(dirty || uncertain) && (
              <Button variant="outline" disabled={busy} onClick={() => setConfirmDiscard(true)}>
                Descartar edição local
              </Button>
            )}
          </div>
          {confirmDiscard && (
            <div role="alert" className="rounded-lg border border-border p-4 space-y-3">
              <p>
                O texto local será descartado. Isso não remove versões salvas nem desfaz uma
                gravação que tenha chegado ao servidor.
              </p>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (pending.current) return;
                  setOpenId(id);
                  setId(undefined);
                  setRevision(0);
                  setForm(formOf(emptyClinicContract()));
                  setDirty(false);
                  setUncertain(false);
                  setConfirmDiscard(false);
                  setMessage("Edição local descartada. O servidor não foi alterado.");
                }}
              >
                Confirmar descarte local
              </Button>
            </div>
          )}
        </>
      )}
      {id && revision > 0 && (
        <ClinicContractHistory
          key={clinicId + ":" + id}
          id={id}
          clinicId={clinicId}
          revision={revision}
          getAccessToken={getAccessToken}
          {...(fetcher ? { fetcher } : {})}
        />
      )}
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Campos em branco não significam gratuidade. Setup é separado das condições recorrentes; não
        há total automático, aceite, emissão de fatura ou liberação de benefícios. Combinação de
        mensalidade e vidas, franquias, vencimento, tributos e demais condições aguardam definição.
      </p>
    </div>
  );
}
