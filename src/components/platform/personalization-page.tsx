import React, { useState } from "react";
import { Save, RotateCcw, Check, Sun, Moon, Palette, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemoClinic } from "@/features/demo/context";
import {
  validColor,
  validImageBase64,
  type ClinicPreferences,
} from "@/features/demo/personalization";
import { brandColorAdjusted, clinicThemeStyle } from "@/features/demo/theme";

export function PersonalizationPage() {
  const { clinic, preferences, ready } = useDemoClinic();
  if (!ready)
    return (
      <div className="page-content" role="status">
        Carregando preferências…
      </div>
    );
  return <PersonalizationForm key={clinic.id} initial={preferences} />;
}
function PersonalizationForm({ initial }: { initial: ClinicPreferences }) {
  const { defaults, savePreferences } = useDemoClinic();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const [previewError, setPreviewError] = useState(false);
  const mounted = React.useRef(true);
  const uploadTokens = React.useRef({ logo: 0, favicon: 0 });

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  React.useEffect(() => {
    setPreviewError(false);
  }, [draft.logo]);
  function update(p: Partial<ClinicPreferences>) {
    if ("logo" in p && p.logo === undefined) uploadTokens.current.logo++;
    if ("favicon" in p && p.favicon === undefined) uploadTokens.current.favicon++;
    setDraft((current) => ({ ...current, ...p }));
    setMessage("");
    setError("");
  }
  function save(value: ClinicPreferences, restored = false) {
    if (!value.name.trim()) {
      setError("Informe o nome de exibição.");
      return;
    }
    if (!validColor(value.primary) || !validColor(value.secondary)) {
      setError("Selecione cores válidas no formato #RRGGBB.");
      return;
    }
    try {
      uploadTokens.current.logo++;
      uploadTokens.current.favicon++;
      savePreferences(value);
      setDraft({ ...value, name: value.name.trim() });
      setError("");
      setMessage(
        restored
          ? "Padrão restaurado e salvo neste navegador."
          : "Personalização salva neste navegador.",
      );
    } catch {
      setError(
        "Não foi possível salvar neste navegador. Verifique se o armazenamento (quota) está permitido e disponível.",
      );
      setMessage("");
    }
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logo" | "favicon",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = ++uploadTokens.current[field];

    if (file.size > 200 * 1024) {
      setError(`A imagem excede o limite de 200KB.`);
      e.target.value = "";
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError(`Apenas imagens PNG, JPEG ou WebP são permitidas.`);
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === "string" && validImageBase64(dataUrl)) {
        const img = new Image();
        img.onload = () => {
          if (mounted.current && token === uploadTokens.current[field]) {
            update({ [field]: dataUrl });
          }
        };
        img.onerror = () => {
          if (mounted.current && token === uploadTokens.current[field]) {
            setError("A imagem não pôde ser decodificada (corrompida).");
          }
        };
        img.src = dataUrl;
      } else if (mounted.current && token === uploadTokens.current[field]) {
        setError("A imagem está corrompida ou tem formato falso.");
      }
    };
    reader.onerror = () => {
      if (mounted.current && token === uploadTokens.current[field])
        setError("Erro ao ler o arquivo de imagem.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">IDENTIDADE DA CLÍNICA</span>
          <h1>
            Personalização<span className="heading-dot">.</span>
          </h1>
          <p>A identidade da sua clínica, em cada ambiente.</p>
        </div>
      </div>
      <div className="personalization-layout">
        <form
          className="personalization-form"
          onSubmit={(event) => {
            event.preventDefault();
            save(draft);
          }}
          noValidate
        >
          <div className="preference-section-heading">
            <Palette size={20} />
            <h2>Identidade visual</h2>
          </div>
          <div className="preference-field">
            <label htmlFor="clinic-display-name">Nome de exibição</label>
            <Input
              id="clinic-display-name"
              value={draft.name}
              maxLength={80}
              required
              aria-invalid={!draft.name.trim()}
              aria-describedby={error ? "preference-error" : undefined}
              onChange={(event) => update({ name: event.target.value })}
            />
          </div>

          <div className="image-fields">
            <div className="preference-field">
              <label htmlFor="clinic-logo">Logomarca</label>
              <span className="field-hint">Máx 200KB (PNG, JPEG, WebP)</span>
              <div className="image-upload-row">
                <Input
                  id="clinic-logo"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => handleImageUpload(e, "logo")}
                />
                {draft.logo && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => update({ logo: undefined })}
                    aria-label="Remover logomarca"
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>

            <div className="preference-field">
              <label htmlFor="clinic-favicon">Ícone da Aba (Favicon)</label>
              <span className="field-hint">Máx 200KB (PNG, JPEG, WebP)</span>
              <div className="image-upload-row">
                <Input
                  id="clinic-favicon"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => handleImageUpload(e, "favicon")}
                />
                {draft.favicon && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => update({ favicon: undefined })}
                    aria-label="Remover favicon"
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          <p className="preference-hint">
            As cores originais aparecem nas amostras. Textos e botões usam ajustes automáticos para
            manter a leitura.
          </p>
          {brandColorAdjusted(draft) && (
            <p className="contrast-note" role="status">
              <ShieldCheck size={17} />A cor principal foi ajustada na prévia para garantir
              contraste.
            </p>
          )}
          <div className="color-fields">
            {(["primary", "secondary"] as const).map((field, i) => (
              <div className="preference-field" key={field}>
                <label htmlFor={`color-${field}`}>
                  {i === 0 ? "Cor principal" : "Cor secundária"}
                </label>
                <div className="color-control">
                  <input
                    id={`color-${field}-picker`}
                    type="color"
                    value={validColor(draft[field]) ? draft[field] : "#000000"}
                    onChange={(event) => update({ [field]: event.target.value })}
                    aria-label={`Selecionador de ${i === 0 ? "cor principal" : "cor secundária"}`}
                  />
                  <Input
                    id={`color-${field}`}
                    type="text"
                    value={draft[field]}
                    onChange={(event) => update({ [field]: event.target.value })}
                    aria-invalid={!validColor(draft[field])}
                    className="color-hex-input"
                    maxLength={7}
                  />
                </div>
              </div>
            ))}
          </div>
          <fieldset className="preference-field">
            <legend>Tema</legend>
            <div className="theme-options">
              {(["light", "dark"] as const).map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  variant={draft.mode === mode ? "default" : "outline"}
                  aria-pressed={draft.mode === mode}
                  onClick={() => update({ mode })}
                >
                  {mode === "light" ? <Sun /> : <Moon />}
                  {mode === "light" ? "Claro" : "Escuro"}
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="preference-actions">
            <Button type="submit">
              <Save />
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={() => save(defaults, true)}>
              <RotateCcw />
              Restaurar padrão
            </Button>
          </div>
          {dirty && !message && <p className="preference-hint">Alterações ainda não salvas.</p>}
          {error && (
            <p className="preference-error" id="preference-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="preference-success" role="status">
              <Check size={16} />
              {message}
            </p>
          )}
        </form>
        <section
          className="clinic-preview"
          data-mode={draft.mode}
          style={clinicThemeStyle(draft)}
          aria-label="Prévia da clínica"
        >
          <div className="preview-topline">
            <h2>Prévia</h2>
            <span className="module-tag">{draft.mode === "dark" ? "Escuro" : "Claro"}</span>
          </div>
          <div className="preview-identity">
            <span className="brand-symbol">
              {draft.logo && !previewError ? (
                <img
                  src={draft.logo}
                  alt="Logo"
                  className="brand-logo-img"
                  onError={() => setPreviewError(true)}
                />
              ) : (
                <Check />
              )}
            </span>
            <strong>{draft.name.trim() || "Nome da clínica"}</strong>
          </div>
          <div className="preview-colors">
            <span className="primary-swatch" aria-label="Cor principal" />
            <span className="secondary-swatch" aria-label="Cor secundária" />
          </div>
          <label htmlFor="preview-name">Nome de exibição</label>
          <Input id="preview-name" value={draft.name} readOnly />
          <div className="preview-actions">
            <Button type="button" disabled>
              Confirmar
            </Button>
            <span className="secondary-preview">Clínica</span>
          </div>
          <p className="preview-scope">
            Aplicada à clínica, área médica e aplicativo do paciente após salvar.
          </p>
        </section>
      </div>
    </div>
  );
}
