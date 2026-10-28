import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BlogDraftHistory } from "./draft-history";
import { BlogDraftLibrary } from "./draft-library";
import { blogDraftDocumentSchema } from "./draft-contract";
import { createBlogDraftClient, BlogDraftConflict } from "./draft-client";
async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
export function BlogDraftWorkspace() {
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
          <CardTitle>Rascunhos editoriais protegidos</CardTitle>
          <CardDescription>
            Conteúdo central neutro, sem dados de pacientes. Salvar um rascunho não o publica nas
            clínicas ou no aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userId ? (
            <BlogDraftEditor key={userId} getAccessToken={token} />
          ) : (
            <p>Entre com sua conta para acessar a edição. O servidor exige Super ADM ativo.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
const empty = () => blogDraftDocumentSchema.parse({ title: "Novo conteúdo" });
export function BlogDraftEditor({
  getAccessToken,
  fetcher,
}: {
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}) {
  const client = useMemo(
    () => createBlogDraftClient(getAccessToken, fetcher),
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
  const [libraryRevision, setLibraryRevision] = useState(0);
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
        setMessage("Rascunho não encontrado.");
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
        setMessage("Não foi possível carregar. Confira seu acesso e a disponibilidade do Blog.");
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function save() {
    if (!id || pending.current || uncertain || !dirty) return;
    const input = blogDraftDocumentSchema.safeParse(document);
    if (!input.success) {
      setMessage("Confira o título e os limites dos campos.");
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
      setMessage("Rascunho salvo e confirmado no servidor.");
      setLibraryRevision((v) => v + 1);
    } catch (error) {
      if (active.current) {
        setUncertain(true);
        setMessage(
          error instanceof BlogDraftConflict
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
      <BlogDraftLibrary
        getAccessToken={getAccessToken}
        {...(fetcher ? { fetcher } : {})}
        disabled={busy || dirty || uncertain}
        onOpen={(target) => void load(target)}
        refreshKey={libraryRevision}
      />
      <div className="flex flex-wrap gap-3">
        <Button onClick={create} disabled={busy || dirty || uncertain}>
          Novo rascunho
        </Button>
        <label className="flex gap-2 items-center">
          <span>Identificador do rascunho</span>
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
          Abrir rascunho
        </Button>
      </div>
      {id && (
        <>
          <p className="text-sm text-muted-foreground">
            ID: <code>{id}</code> ·{" "}
            {revision > 0 ? `Revisão confirmada ${revision}` : "Ainda não salvo"}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {(["title", "summary", "category", "authorName", "references", "license"] as const).map(
              (key) => (
                <label key={key} className="space-y-2">
                  <span>
                    {
                      {
                        title: "Título",
                        summary: "Resumo",
                        category: "Categoria",
                        authorName: "Autoria editorial",
                        references: "Referências",
                        license: "Licença e créditos",
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
              ),
            )}
          </div>
          <label className="block space-y-2">
            <span>Conteúdo em texto</span>
            <Textarea
              value={document.body}
              rows={10}
              disabled={!editable}
              onChange={(e) => {
                setDocument((v) => ({ ...v, body: e.target.value }));
                setDirty(true);
              }}
            />
          </label>
          <div className="flex gap-3">
            <Button disabled={!editable || !dirty} onClick={() => void save()}>
              Salvar rascunho
            </Button>
            {uncertain && (
              <Button variant="outline" disabled={busy} onClick={() => void load(id, true)}>
                Recarregar versão do servidor
              </Button>
            )}
          </div>
          {revision > 0 && (
            <BlogDraftHistory
              key={id}
              id={id}
              revision={revision}
              getAccessToken={getAccessToken}
              {...(fetcher ? { fetcher } : {})}
            />
          )}
          <article
            aria-label="Prévia textual do rascunho"
            className="rounded-xl border border-border bg-card/60 p-5"
          >
            <h3 className="font-semibold">{document.title}</h3>
            <p>{document.summary}</p>
            <p className="whitespace-pre-wrap mt-3">{document.body}</p>
          </article>
        </>
      )}
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        A publicação, mídias e seleção pelas clínicas ainda não estão habilitadas. Alterações não
        salvas ficam apenas nesta tela.
      </p>
    </div>
  );
}
