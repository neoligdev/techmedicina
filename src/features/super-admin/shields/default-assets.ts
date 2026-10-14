import { ShieldId } from "@/features/journey/contracts";
import { ShieldArtAsset, ShieldArtVariant } from "./types";
import { calculateSvgHash } from "./sanitizer";

export interface ShieldMetadataConfig {
  id: ShieldId;
  name: string;
  themeColor: string;
  baseDescription: string;
}

export const OFFICIAL_SHIELD_METADATA: Record<ShieldId, ShieldMetadataConfig> = {
  origem: {
    id: "origem",
    name: "Origem",
    themeColor: "#D97706",
    baseDescription: "Início da jornada e reconhecimento da linha de base de hábitos e saúde.",
  },
  ritmo: {
    id: "ritmo",
    name: "Ritmo",
    themeColor: "#F59E0B",
    baseDescription: "Construção de constância e cadência nas rotinas de cuidado diário.",
  },
  avanco: {
    id: "avanco",
    name: "Avanço",
    themeColor: "#10B981",
    baseDescription: "Evolução sustentada com superação consistente das metas acordadas.",
  },
  equilibrio: {
    id: "equilibrio",
    name: "Equilíbrio",
    themeColor: "#3B82F6",
    baseDescription: "Harmonia entre saúde, rotina e bem-estar, com alto nível de adesão.",
  },
  plenitude: {
    id: "plenitude",
    name: "Plenitude",
    themeColor: "#8B5CF6",
    baseDescription: "Excelência e integração completa dos pilares de saúde e vitalidade.",
  },
};

/**
 * Gera o SVG vetorial oficial para cada uma das 15 variações canônicas.
 */
function createOfficialSvg(shieldId: ShieldId, variant: ShieldArtVariant): string {
  const meta = OFFICIAL_SHIELD_METADATA[shieldId];

  if (variant === "locked") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="Escudo ${meta.name} Bloqueado" role="img">
  <title>Escudo ${meta.name} — Bloqueado</title>
  <desc>Escudo ${meta.name} aguardando conquista na jornada Techmedicina.</desc>
  <defs>
    <linearGradient id="grad-locked-${shieldId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4B5563" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#1F2937" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  <path d="M50 8 L84 20 C84 56 50 88 50 88 C50 88 16 56 16 20 Z" fill="url(#grad-locked-${shieldId})" stroke="#6B7280" stroke-width="2.5" stroke-dasharray="4 2"/>
  <circle cx="50" cy="46" r="14" fill="#374151" stroke="#9CA3AF" stroke-width="1.5"/>
  <path d="M46 45 V41 C46 38.8 47.8 37 50 37 C52.2 37 54 38.8 54 41 V45" fill="none" stroke="#E5E7EB" stroke-width="2" stroke-linecap="round"/>
  <rect x="44" y="45" width="12" height="10" rx="2" fill="#E5E7EB"/>
  <circle cx="50" cy="50" r="1.5" fill="#374151"/>
</svg>`.trim();
  }

  if (variant === "earned") {
    // Medalhão perpétuo de conquista confirmada (borda dupla, selo de honra histórica)
    const color = meta.themeColor;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="Escudo ${meta.name} Histórico Conquistado" role="img">
  <title>Escudo ${meta.name} — Conquista Histórica</title>
  <desc>Escudo ${meta.name} conquistado permanentemente na história do paciente.</desc>
  <defs>
    <linearGradient id="grad-earned-${shieldId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="50%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
    <linearGradient id="grad-gold-rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
  </defs>
  <path d="M50 6 L86 19 C86 58 50 92 50 92 C50 92 14 58 14 19 Z" fill="url(#grad-gold-rim)" stroke="#F59E0B" stroke-width="1.5"/>
  <path d="M50 11 L80 22 C80 54 50 84 50 84 C50 84 20 54 20 22 Z" fill="url(#grad-earned-${shieldId})" stroke="#FEF3C7" stroke-width="1.5"/>
  <circle cx="50" cy="46" r="16" fill="rgba(255,255,255,0.2)" stroke="#FEF3C7" stroke-width="1"/>
  <polygon points="50,34 54,42 63,43 56,49 58,58 50,53 42,58 44,49 37,43 46,42" fill="#FEF08A" stroke="#B45309" stroke-width="0.8"/>
  <path d="M40 68 L50 63 L60 68 L50 72 Z" fill="#FEF08A" opacity="0.9"/>
</svg>`.trim();
  }

  // Variant: "active" (Design emblemático de cada um dos 5 escudos)
  switch (shieldId) {
    case "origem":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="Escudo Origem Ativo" role="img">
  <title>Escudo Origem — Ativo</title>
  <desc>Escudo Origem com semente nascente e horizonte terra-cobre.</desc>
  <defs>
    <linearGradient id="grad-origem-active" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="60%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
  </defs>
  <path d="M50 8 L84 20 C84 56 50 88 50 88 C50 88 16 56 16 20 Z" fill="url(#grad-origem-active)" stroke="#FDE68A" stroke-width="2"/>
  <path d="M50 16 C68 34 70 54 50 74 C30 54 32 34 50 16 Z" fill="rgba(255,255,255,0.15)"/>
  <path d="M50 32 C58 44 58 52 50 62 C42 52 42 44 50 32 Z" fill="#FEF3C7" stroke="#92400E" stroke-width="1.5"/>
  <circle cx="50" cy="62" r="3" fill="#D97706"/>
</svg>`.trim();

    case "ritmo":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="Escudo Ritmo Ativo" role="img">
  <title>Escudo Ritmo — Ativo</title>
  <desc>Escudo Ritmo com pulso cardíaco solar cadenciado.</desc>
  <defs>
    <linearGradient id="grad-ritmo-active" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <path d="M50 8 L84 20 C84 56 50 88 50 88 C50 88 16 56 16 20 Z" fill="url(#grad-ritmo-active)" stroke="#FEF3C7" stroke-width="2"/>
  <circle cx="50" cy="48" r="22" fill="rgba(255,255,255,0.18)" stroke="#FEF3C7" stroke-width="1"/>
  <polyline points="28,48 38,48 43,36 47,58 53,40 57,52 62,48 72,48" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`.trim();

    case "avanco":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="Escudo Avanço Ativo" role="img">
  <title>Escudo Avanço — Ativo</title>
  <desc>Escudo Avanço com montanhas ascendentes em verde esmeralda.</desc>
  <defs>
    <linearGradient id="grad-avanco-active" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="50%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <path d="M50 8 L84 20 C84 56 50 88 50 88 C50 88 16 56 16 20 Z" fill="url(#grad-avanco-active)" stroke="#A7F3D0" stroke-width="2"/>
  <polygon points="50,28 68,58 32,58" fill="#D1FAE5" opacity="0.9"/>
  <polygon points="50,28 60,58 40,58" fill="#FFFFFF"/>
  <polygon points="34,44 48,64 20,64" fill="#065F46" opacity="0.6"/>
  <polygon points="66,44 80,64 52,64" fill="#065F46" opacity="0.6"/>
</svg>`.trim();

    case "equilibrio":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="Escudo Equilíbrio Ativo" role="img">
  <title>Escudo Equilíbrio — Ativo</title>
  <desc>Escudo Equilíbrio com horizonte sereno em azul safira.</desc>
  <defs>
    <linearGradient id="grad-equilibrio-active" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="50%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>
  <path d="M50 8 L84 20 C84 56 50 88 50 88 C50 88 16 56 16 20 Z" fill="url(#grad-equilibrio-active)" stroke="#BFDBFE" stroke-width="2"/>
  <circle cx="50" cy="46" r="20" fill="none" stroke="#DBEAFE" stroke-width="2"/>
  <line x1="30" y1="46" x2="70" y2="46" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="50" cy="36" r="4" fill="#DBEAFE"/>
  <path d="M35 56 C40 50 60 50 65 56" fill="none" stroke="#EFF6FF" stroke-width="2" stroke-linecap="round"/>
</svg>`.trim();

    case "plenitude":
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="Escudo Plenitude Ativo" role="img">
  <title>Escudo Plenitude — Ativo</title>
  <desc>Escudo Plenitude com sol e coroa dourada em púrpura imperial.</desc>
  <defs>
    <linearGradient id="grad-plenitude-active" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="40%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#581C87"/>
    </linearGradient>
    <radialGradient id="grad-sun-core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </radialGradient>
  </defs>
  <path d="M50 8 L84 20 C84 56 50 88 50 88 C50 88 16 56 16 20 Z" fill="url(#grad-plenitude-active)" stroke="#FEF08A" stroke-width="2.5"/>
  <circle cx="50" cy="46" r="15" fill="url(#grad-sun-core)" stroke="#FEF3C7" stroke-width="1.5"/>
  <!-- Raios solares triunfantes -->
  <line x1="50" y1="24" x2="50" y2="18" stroke="#FEF08A" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="50" y1="68" x2="50" y2="74" stroke="#FEF08A" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="28" y1="46" x2="22" y2="46" stroke="#FEF08A" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="72" y1="46" x2="78" y2="46" stroke="#FEF08A" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="34" y1="30" x2="30" y2="26" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>
  <line x1="66" y1="62" x2="70" y2="66" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>
  <line x1="34" y1="62" x2="30" y2="66" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>
  <line x1="66" y1="30" x2="70" y2="26" stroke="#FEF08A" stroke-width="2" stroke-linecap="round"/>
</svg>`.trim();
  }
}

/**
 * Constrói as 15 variações canônicas iniciais (v1.0.0 oficial).
 */
export function buildDefaultShieldCatalog(): Record<string, ShieldArtAsset> {
  const shieldIds: ShieldId[] = ["origem", "ritmo", "avanco", "equilibrio", "plenitude"];
  const variants: ShieldArtVariant[] = ["active", "earned", "locked"];
  const catalog: Record<string, ShieldArtAsset> = {};

  const variantLabels: Record<ShieldArtVariant, string> = {
    active: "Ativo",
    earned: "Conquistado (Histórico)",
    locked: "Bloqueado",
  };

  for (const shieldId of shieldIds) {
    const meta = OFFICIAL_SHIELD_METADATA[shieldId];
    for (const variant of variants) {
      const assetId = `${shieldId}_${variant}`;
      const svg = createOfficialSvg(shieldId, variant);
      const hash = calculateSvgHash(svg);

      catalog[assetId] = {
        id: assetId,
        shieldId,
        variant,
        name: `${meta.name} — ${variantLabels[variant]}`,
        description: `${meta.baseDescription} (Variação: ${variantLabels[variant]}).`,
        themeColor: meta.themeColor,
        svgContent: svg,
        svgHash: hash,
        version: "1.0.0",
        status: "published",
        updatedAt: "2026-10-14T12:00:00.000Z",
        updatedBy: "Super ADM (PlugPix)",
        publishedAt: "2026-10-14T12:00:00.000Z",
        publishedBy: "Super ADM (PlugPix)",
        accessibilityLabel: `Escudo oficial ${meta.name}, variação ${variantLabels[variant]}`,
      };
    }
  }

  return catalog;
}
