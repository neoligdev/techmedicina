import { useState } from "react";
import { Save, RotateCcw, Check, Sun, Moon, Palette, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemoClinic } from "@/features/demo/context";
import { validColor, type ClinicPreferences } from "@/features/demo/personalization";
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
  function update(p: Partial<ClinicPreferences>) {
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
        "Não foi possível salvar neste navegador. Verifique se o armazenamento está permitido.",
      );
      setMessage("");
    }
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
                    id={`color-${field}`}
                    type="color"
                    value={draft[field]}
                    onChange={(event) => update({ [field]: event.target.value })}
                  />
                  <span>{draft[field].toUpperCase()}</span>
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
              <Check />
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
