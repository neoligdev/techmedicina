import { ShieldId } from "./contracts";
import { PublicShieldArt, ShieldArtVariant } from "../super-admin/shields/types";
import { getShieldCatalog } from "../super-admin/shields/storage";

/**
 * Serviço de acesso a ativos visuais dos Escudos para o PWA do paciente e painel clínico.
 * Retorna exclusivamente ativos oficialmente publicados e sanitizados.
 */
export class ShieldArtService {
  /**
   * Recupera todas as artes oficialmente publicadas (até 15 variações).
   */
  static getPublishedShieldArts(): PublicShieldArt[] {
    const catalog = getShieldCatalog();
    const assets = Object.values(catalog.assets);

    return assets
      .filter((asset) => asset.status === "published")
      .map((asset) => ({
        id: asset.id,
        shieldId: asset.shieldId,
        variant: asset.variant,
        name: asset.name,
        svgContent: asset.svgContent,
        svgHash: asset.svgHash,
        version: asset.version,
        accessibilityLabel: asset.accessibilityLabel,
        themeColor: asset.themeColor,
      }));
  }

  /**
   * Recupera uma variação específica de um Escudo para renderização no app.
   */
  static getShieldArt(shieldId: ShieldId, variant: ShieldArtVariant): PublicShieldArt | null {
    const catalog = getShieldCatalog();
    const assetId = `${shieldId}_${variant}`;
    const asset = catalog.assets[assetId];

    if (!asset || asset.status !== "published") {
      return null;
    }

    return {
      id: asset.id,
      shieldId: asset.shieldId,
      variant: asset.variant,
      name: asset.name,
      svgContent: asset.svgContent,
      svgHash: asset.svgHash,
      version: asset.version,
      accessibilityLabel: asset.accessibilityLabel,
      themeColor: asset.themeColor,
    };
  }
}
