import React, { useState } from "react";
import {
  Save,
  RotateCcw,
  Check,
  Sun,
  Moon,
  Palette,
  ShieldCheck,
  Smartphone,
  Upload,
  Trash2,
  Bell,
  Sparkles,
  ClipboardList,
  CalendarDays,
  FileText,
  AlertCircle,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDemoClinic } from "@/features/demo/context";
import {
  validColor,
  validImageBase64,
  DEFAULT_TEXTURE_CATALOG,
  type ClinicPreferences,
  type CustomTextureItem,
  type StandardTextureOption,
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
  const [draft, setDraft] = useState<ClinicPreferences>(initial);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [textureError, setTextureError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const [previewError, setPreviewError] = useState(false);
  const mounted = React.useRef(true);
  const uploadTokens = React.useRef({ logo: 0, favicon: 0, texture: 0 });

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
    setTextureError("");
  }

  function handleCancel() {
    setDraft(initial);
    setError("");
    setTextureError("");
    setMessage("Alterações descartadas. Configuração salva restaurada.");
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
      setTextureError("");
      setMessage(
        restored
          ? "Padrão restaurado e salvo com sucesso."
          : "Personalização e fundo do aplicativo salvos com sucesso.",
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

  async function handleTextureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = ++uploadTokens.current.texture;

    // Limite rigoroso de 5MB conforme especificação
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setTextureError("O arquivo excede o limite máximo permitido de 5 MB.");
      e.target.value = "";
      return;
    }

    // Proibir SVG, executáveis ou formatos não autorizados
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setTextureError(
        "Formato não suportado. Envie apenas imagens JPG, PNG ou WebP. Arquivos SVG ou executáveis são proibidos.",
      );
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      // Validação estrita de magic bytes e tamanho
      if (typeof dataUrl === "string" && validImageBase64(dataUrl, maxBytes)) {
        const img = new Image();
        img.onload = () => {
          if (mounted.current && token === uploadTokens.current.texture) {
            const cleanName =
              file.name.replace(/\.[^/.]+$/, "").slice(0, 35) || "Textura personalizada";
            const newTexture: CustomTextureItem = {
              id: `custom-${Date.now()}`,
              name: cleanName,
              url: dataUrl,
              createdAt: new Date().toISOString(),
            };
            const updatedCustoms = [...(draft.customTextures || []), newTexture];
            update({
              customTextures: updatedCustoms,
              textureId: newTexture.id,
              textureUrl: newTexture.url,
            });
            setTextureError("");
            setMessage(
              "Nova textura carregada na prévia! Clique em 'Salvar alterações' para publicar aos pacientes.",
            );
          }
        };
        img.onerror = () => {
          if (mounted.current && token === uploadTokens.current.texture) {
            setTextureError("A imagem enviada não pôde ser decodificada ou está corrompida.");
          }
        };
        img.src = dataUrl;
      } else if (mounted.current && token === uploadTokens.current.texture) {
        setTextureError(
          "O arquivo possui cabeçalho inválido, corrompido ou excede o limite de tamanho.",
        );
      }
    };
    reader.onerror = () => {
      if (mounted.current && token === uploadTokens.current.texture) {
        setTextureError("Erro ao ler o arquivo selecionado.");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleSelectTexture(item: StandardTextureOption | CustomTextureItem) {
    if ("isAvailable" in item && !item.isAvailable) return;
    if (!item.url) return;
    update({
      textureId: item.id,
      textureUrl: item.url,
    });
  }

  function handleRemoveCustomTexture(id: string) {
    const nextCustoms = (draft.customTextures || []).filter((item) => item.id !== id);
    const updates: Partial<ClinicPreferences> = { customTextures: nextCustoms };
    if (draft.textureId === id) {
      // Se a textura removida era a ativa no rascunho, volta para o salvo ou padrão
      const fallback =
        initial.textureId && initial.textureId !== id
          ? initial
          : { textureId: "texture-3", textureUrl: "/textures/texture-3.jpg" };
      updates.textureId = fallback.textureId;
      updates.textureUrl = fallback.textureUrl;
    }
    update(updates);
    setMessage("Textura removida da lista. Clique em Salvar alterações para confirmar.");
  }

  const activeTextureUrl = draft.textureUrl || "/textures/texture-3.jpg";
  const savedTextureId = initial.textureId || "texture-3";

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
          {/* SEÇÃO 1: Identidade Visual Tradicional */}
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

          {/* SEÇÃO 2: Fundo do aplicativo (Celular do paciente) */}
          <div className="preference-section-heading">
            <Smartphone size={20} />
            <h2>Fundo do aplicativo</h2>
          </div>
          <p className="preference-hint">
            Personalize a textura de fundo aplicada na tela inicial do aplicativo dos pacientes
            desta clínica no celular. Os computadores e tablets mantêm o fundo institucional neutro.
          </p>

          {/* Galeria de texturas padrão */}
          <div className="texture-gallery-section">
            <label className="section-sublabel">Catálogo padrão de texturas</label>
            <div
              className="texture-grid"
              role="radiogroup"
              aria-label="Catálogo padrão de texturas"
            >
              {DEFAULT_TEXTURE_CATALOG.map((item) => {
                const isSaved = savedTextureId === item.id;
                const isSelectedInDraft = draft.textureId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelectedInDraft}
                    disabled={!item.isAvailable}
                    className={`texture-card ${isSelectedInDraft ? "is-selected" : ""} ${isSaved ? "is-saved" : ""} ${!item.isAvailable ? "is-unavailable" : ""}`}
                    onClick={() => handleSelectTexture(item)}
                  >
                    <div className="texture-thumbnail-container">
                      {item.url ? (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="texture-thumb-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="texture-placeholder">
                          <ImageIcon size={24} />
                          <span>Pendente</span>
                        </div>
                      )}
                      {isSaved && (
                        <span className="texture-badge published" title="Textura atualmente salva">
                          <Check size={11} /> Salva
                        </span>
                      )}
                      {isSelectedInDraft && !isSaved && (
                        <span
                          className="texture-badge selected"
                          title="Selecionada para prévia (ainda não salva)"
                        >
                          Em edição
                        </span>
                      )}
                      {!item.isAvailable && (
                        <span className="texture-badge unavailable">Pendente</span>
                      )}
                    </div>
                    <div className="texture-card-info">
                      <strong className="texture-card-name">{item.name}</strong>
                      <span className="texture-card-desc">{item.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção Minhas Texturas */}
          <div className="texture-custom-section">
            <div className="custom-section-header">
              <label className="section-sublabel">Minhas texturas (enviadas pela clínica)</label>
              <label
                htmlFor="clinic-texture-upload"
                className="btn-upload-texture"
                tabIndex={0}
                role="button"
              >
                <Upload size={14} />
                Enviar textura
              </label>
              <input
                id="clinic-texture-upload"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="sr-only"
                onChange={handleTextureUpload}
              />
            </div>
            <span className="field-hint">
              Formatos aceitos: JPG, PNG, WebP • Limite máximo: 5 MB por arquivo • SVG e executáveis
              rejeitados.
            </span>

            {textureError && (
              <p className="preference-error" role="alert">
                <AlertCircle size={15} />
                {textureError}
              </p>
            )}

            {draft.customTextures && draft.customTextures.length > 0 ? (
              <div className="texture-grid" role="radiogroup" aria-label="Minhas texturas enviadas">
                {draft.customTextures.map((custom) => {
                  const isSaved = savedTextureId === custom.id;
                  const isSelectedInDraft = draft.textureId === custom.id;
                  return (
                    <div
                      key={custom.id}
                      className={`texture-card is-custom ${isSelectedInDraft ? "is-selected" : ""} ${isSaved ? "is-saved" : ""}`}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isSelectedInDraft}
                        className="texture-select-action"
                        onClick={() => handleSelectTexture(custom)}
                      >
                        <div className="texture-thumbnail-container">
                          <img src={custom.url} alt={custom.name} className="texture-thumb-image" />
                          {isSaved && (
                            <span
                              className="texture-badge published"
                              title="Textura atualmente salva"
                            >
                              <Check size={11} /> Salva
                            </span>
                          )}
                          {isSelectedInDraft && !isSaved && (
                            <span className="texture-badge selected">Em edição</span>
                          )}
                        </div>
                        <div className="texture-card-info">
                          <strong className="texture-card-name">{custom.name}</strong>
                          <span className="texture-card-desc">Personalizada</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="btn-delete-texture"
                        onClick={() => handleRemoveCustomTexture(custom.id)}
                        aria-label={`Excluir textura ${custom.name}`}
                        title="Excluir textura"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-textures-note">
                Nenhuma textura personalizada enviada por esta clínica. Clique em "Enviar textura"
                para carregar uma imagem própria de até 5 MB.
              </p>
            )}
          </div>

          {/* BOTÕES DE AÇÃO: Salvar alterações e Cancelar */}
          <div className="preference-actions">
            <Button type="submit" aria-label="Salvar">
              <Save size={16} />
              Salvar alterações
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={!dirty}>
              <RotateCcw size={16} />
              Cancelar
            </Button>
            <Button type="button" variant="ghost" onClick={() => save(defaults, true)}>
              Restaurar padrão
            </Button>
          </div>

          {dirty && !message && (
            <p className="preference-hint">
              Alterações em edição ainda não salvas. Os pacientes só verão as novas escolhas após
              clicar em "Salvar alterações".
            </p>
          )}
          {error && (
            <p className="preference-error" id="preference-error" role="alert">
              <AlertCircle size={15} />
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

        {/* PRÉVIA: Celular do Paciente com vidro fosco e marca da clínica */}
        <div className="preview-column">
          <section
            className="clinic-preview"
            data-mode={draft.mode}
            style={clinicThemeStyle(draft)}
            aria-label="Prévia da clínica"
          >
            <div className="preview-topline">
              <h2>Identidade institucional</h2>
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
          </section>

          {/* SIMULAÇÃO EM FORMATO DE SMARTPHONE */}
          <section
            className="smartphone-preview-wrapper"
            aria-label="Prévia do celular do paciente"
          >
            <div className="smartphone-header-title">
              <h3>Prévia do aplicativo do paciente (Celular)</h3>
              {draft.textureId !== initial.textureId ? (
                <span className="badge-preview-status draft">Prévia da seleção (Não salva)</span>
              ) : (
                <span className="badge-preview-status active">Textura publicada</span>
              )}
            </div>

            <div className="smartphone-device-frame">
              <div className="smartphone-notch">
                <span className="smartphone-speaker" />
                <span className="smartphone-camera" />
              </div>

              {/* TELA INTERNA DO CELULAR COM TEXTURA DE FUNDO E VIDRO FOSCO */}
              <div
                className="smartphone-screen"
                style={{
                  backgroundImage: `url("${activeTextureUrl}")`,
                }}
              >
                {/* Status Bar */}
                <div className="phone-status-bar">
                  <span>09:41</span>
                  <div className="phone-status-icons">
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Topo do App: Logo e Notificações com Vidro Fosco */}
                <header className="phone-app-header">
                  <div className="phone-clinic-brand">
                    <span className="phone-brand-circle">
                      {draft.logo ? (
                        <img src={draft.logo} alt="Logo" className="phone-brand-logo" />
                      ) : (
                        (draft.name[0] || "C").toUpperCase()
                      )}
                    </span>
                    <span className="phone-clinic-name">
                      {draft.name.trim() || "Clínica Saúde"}
                    </span>
                  </div>
                  <div className="phone-bell-glass">
                    <Bell size={14} />
                    <span className="phone-bell-dot" />
                  </div>
                </header>

                {/* Conteúdo rolável simulado */}
                <div className="phone-screen-content">
                  <div className="phone-greeting">
                    <p className="phone-greeting-sub">Olá, Paciente</p>
                    <h4 className="phone-greeting-main">Como você está se sentindo hoje?</h4>
                  </div>

                  {/* Card Avisos (Vidro Fosco) */}
                  <div className="phone-glass-card phone-notice-card">
                    <div className="phone-card-title-row">
                      <Sparkles size={14} className="text-primary" />
                      <strong>Avisos importantes</strong>
                    </div>
                    <p>Seus exames laboratoriais recentes estão disponíveis para consulta.</p>
                  </div>

                  {/* Atalhos Rápidos em 3 Colunas (Vidro Fosco) */}
                  <div className="phone-shortcuts-section">
                    <span className="phone-section-label">Acessos rápidos</span>
                    <div className="phone-shortcuts-grid">
                      <div className="phone-shortcut-square">
                        <FileText size={16} />
                        <span>Plano</span>
                      </div>
                      <div className="phone-shortcut-square">
                        <ClipboardList size={16} />
                        <span>Exames</span>
                      </div>
                      <div className="phone-shortcut-square">
                        <CalendarDays size={16} />
                        <span>Agenda</span>
                      </div>
                    </div>
                  </div>

                  {/* Card de Hidratação (Vidro Fosco) */}
                  <div className="phone-glass-card phone-water-card">
                    <div className="phone-card-title-row">
                      <span>💧</span>
                      <strong>Hidratação</strong>
                    </div>
                    <div className="phone-water-bar">
                      <div className="phone-water-fill" style={{ width: "70%" }} />
                    </div>
                    <span className="phone-water-text">1.750 ml de 2.500 ml</span>
                  </div>
                </div>

                {/* Barra Inferior com 6 Destinos (Vidro Fosco) */}
                <nav className="phone-bottom-nav">
                  <span className="phone-nav-item active">Início</span>
                  <span className="phone-nav-item">Agenda</span>
                  <span className="phone-nav-item">Prontuário</span>
                  <span className="phone-nav-item">Financeiro</span>
                  <span className="phone-nav-item">Benefícios</span>
                  <span className="phone-nav-item">Mais</span>
                </nav>
              </div>
            </div>

            <p className="preview-scope">
              A textura selecionada é renderizada com efeito de vidro fosco no celular dos pacientes
              desta clínica. Computadores e tablets preservam a interface padrão.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
