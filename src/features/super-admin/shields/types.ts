import { ShieldId } from "@/features/journey/contracts";

export type ShieldArtVariant = "active" | "earned" | "locked";
export type ShieldArtStatus = "published" | "draft";

export interface ShieldArtAsset {
  id: string; // Ex: "origem_active", "ritmo_locked"
  shieldId: ShieldId;
  variant: ShieldArtVariant;
  name: string;
  description: string;
  themeColor: string; // Cor semântica oficial em hex
  svgContent: string; // SVG vetorial limpo e sanitizado
  svgHash: string; // Hash SHA-256 do conteúdo para integridade
  version: string; // Versão semântica do ativo (ex: "1.0.0")
  status: ShieldArtStatus;
  updatedAt: string; // ISO
  updatedBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
  accessibilityLabel: string;
}

export interface ShieldVersionRecord {
  version: string;
  publishedAt: string;
  publishedBy: string;
  changeSummary: string;
  snapshot: Record<
    string,
    { svgHash: string; version: string; updatedAt: string; asset?: ShieldArtAsset | undefined }
  >;
}

export interface ShieldCatalogState {
  version: string;
  publishedAt: string;
  publishedBy: string;
  assets: Record<string, ShieldArtAsset>; // 15 ativos indexados por id
  history: ShieldVersionRecord[];
}

export interface PublicShieldArt {
  id: string;
  shieldId: ShieldId;
  variant: ShieldArtVariant;
  name: string;
  svgContent: string;
  svgHash: string;
  version: string;
  accessibilityLabel: string;
  themeColor: string;
}
