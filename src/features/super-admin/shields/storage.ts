import { ShieldCatalogState, ShieldArtAsset, ShieldVersionRecord } from "./types";
import { buildDefaultShieldCatalog } from "./default-assets";
import { validateAndSanitizeSvg } from "./sanitizer";

export const SHIELD_CATALOG_STORAGE_KEY = "tm_shield_arts_catalog_v1";

export interface UserAuthContext {
  userId: string;
  role: string;
}

/**
 * Cria o estado inicial do catálogo com os 15 ativos oficiais na versão 1.0.0.
 */
export function createInitialCatalogState(): ShieldCatalogState {
  const defaultAssets = buildDefaultShieldCatalog();
  const initialRecord: ShieldVersionRecord = {
    version: "1.0.0",
    publishedAt: "2026-10-14T12:00:00.000Z",
    publishedBy: "Super ADM (PlugPix)",
    changeSummary: "Publicação inicial das 15 variações dos cinco Escudos oficiais (PRD v0.11.3).",
    snapshot: Object.fromEntries(
      Object.entries(defaultAssets).map(([id, asset]) => [
        id,
        { svgHash: asset.svgHash, version: asset.version, updatedAt: asset.updatedAt },
      ]),
    ),
  };

  return {
    version: "1.0.0",
    publishedAt: "2026-10-14T12:00:00.000Z",
    publishedBy: "Super ADM (PlugPix)",
    assets: defaultAssets,
    history: [initialRecord],
  };
}

let inMemoryCatalog: ShieldCatalogState = createInitialCatalogState();

/**
 * Recupera o catálogo atual de artes dos Escudos.
 */
export function getShieldCatalog(): ShieldCatalogState {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(SHIELD_CATALOG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ShieldCatalogState;
        if (parsed && parsed.assets && Object.keys(parsed.assets).length === 15) {
          return parsed;
        }
      }
    } catch {
      // Fallback em caso de erro no localStorage
    }
  }
  return inMemoryCatalog;
}

/**
 * Salva o estado do catálogo no storage local e na memória.
 */
function persistCatalog(state: ShieldCatalogState): void {
  inMemoryCatalog = state;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(SHIELD_CATALOG_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignora erro em quota ou restrições de navegação privada
    }
  }
}

/**
 * Atualiza o arquivo vetorial de uma arte de escudo no catálogo.
 * Apenas o Super ADM pode executar esta alteração.
 */
export function updateShieldAsset(params: {
  assetId: string;
  rawSvg: string;
  userContext: UserAuthContext;
}): { success: boolean; asset?: ShieldArtAsset; error?: string } {
  const { assetId, rawSvg, userContext } = params;

  if (userContext.role !== "super_admin") {
    return {
      success: false,
      error:
        "Acesso negado: apenas o Super ADM possui autorização para alterar ativos oficiais da biblioteca.",
    };
  }

  const catalog = getShieldCatalog();
  const currentAsset = catalog.assets[assetId];
  if (!currentAsset) {
    return { success: false, error: `Ativo de escudo com ID '${assetId}' não encontrado.` };
  }

  // Sanitização e validação de segurança do SVG
  const validation = validateAndSanitizeSvg(rawSvg);
  if (!validation.isValid || !validation.sanitizedSvg || !validation.hash) {
    return { success: false, error: validation.error || "Arquivo SVG inválido." };
  }

  const updatedAsset: ShieldArtAsset = {
    ...currentAsset,
    svgContent: validation.sanitizedSvg,
    svgHash: validation.hash,
    status: "draft",
    updatedAt: new Date().toISOString(),
    updatedBy: userContext.userId || "Super ADM",
  };

  catalog.assets[assetId] = updatedAsset;
  persistCatalog(catalog);

  return { success: true, asset: updatedAsset };
}

/**
 * Publica formalmente uma nova versão da Biblioteca de Escudos com os ativos vigentes.
 */
export function publishCatalogVersion(params: {
  newVersion: string;
  changeSummary: string;
  userContext: UserAuthContext;
}): { success: boolean; catalog?: ShieldCatalogState; error?: string } {
  const { newVersion, changeSummary, userContext } = params;

  if (userContext.role !== "super_admin") {
    return {
      success: false,
      error: "Acesso negado: apenas o Super ADM pode homologar e publicar versões oficiais.",
    };
  }

  if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion.trim())) {
    return { success: false, error: "Versão inválida. Utilize o formato semântico (ex: 1.1.0)." };
  }

  const catalog = getShieldCatalog();
  const now = new Date().toISOString();
  const publisher = userContext.userId || "Super ADM";

  // Promover todos os ativos para status "published" na nova versão
  for (const id of Object.keys(catalog.assets)) {
    const asset = catalog.assets[id]!;
    catalog.assets[id] = {
      ...asset,
      status: "published",
      version: newVersion,
      publishedAt: now,
      publishedBy: publisher,
    };
  }

  const versionRecord: ShieldVersionRecord = {
    version: newVersion,
    publishedAt: now,
    publishedBy: publisher,
    changeSummary: changeSummary.trim() || "Publicação de nova revisão de ativos de Escudos.",
    snapshot: Object.fromEntries(
      Object.entries(catalog.assets).map(([id, asset]) => [
        id,
        { svgHash: asset.svgHash, version: asset.version, updatedAt: asset.updatedAt },
      ]),
    ),
  };

  catalog.version = newVersion;
  catalog.publishedAt = now;
  catalog.publishedBy = publisher;
  catalog.history.unshift(versionRecord);

  persistCatalog(catalog);
  return { success: true, catalog };
}

/**
 * Realiza o rollback para uma versão anterior publicada no histórico.
 */
export function rollbackToVersion(params: {
  targetVersion: string;
  userContext: UserAuthContext;
}): { success: boolean; catalog?: ShieldCatalogState; error?: string } {
  const { targetVersion, userContext } = params;

  if (userContext.role !== "super_admin") {
    return {
      success: false,
      error: "Acesso negado: apenas o Super ADM pode executar rollback de versão.",
    };
  }

  const catalog = getShieldCatalog();
  const targetRecord = catalog.history.find((h) => h.version === targetVersion);
  if (!targetRecord) {
    return { success: false, error: `Versão alvo '${targetVersion}' não encontrada no histórico.` };
  }

  // Restaura os ativos e registra o evento de reversão
  const now = new Date().toISOString();
  for (const id of Object.keys(catalog.assets)) {
    const snap = targetRecord.snapshot[id];
    if (snap) {
      catalog.assets[id] = {
        ...catalog.assets[id]!,
        version: snap.version,
        svgHash: snap.svgHash,
        status: "published",
        updatedAt: now,
        updatedBy: `Rollback por ${userContext.userId || "Super ADM"}`,
      };
    }
  }

  catalog.version = `${targetVersion}-revert`;
  catalog.publishedAt = now;
  catalog.publishedBy = `Rollback para ${targetVersion}`;

  persistCatalog(catalog);
  return { success: true, catalog };
}

/**
 * Restaura o catálogo padrão de fábrica v1.0.0 com as 15 artes canônicas.
 */
export function resetShieldCatalog(userContext: UserAuthContext): {
  success: boolean;
  catalog?: ShieldCatalogState;
  error?: string;
} {
  if (userContext.role !== "super_admin") {
    return {
      success: false,
      error: "Acesso negado: apenas o Super ADM pode redefinir a biblioteca.",
    };
  }

  const freshCatalog = createInitialCatalogState();
  persistCatalog(freshCatalog);
  return { success: true, catalog: freshCatalog };
}
