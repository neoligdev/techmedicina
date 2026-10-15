import { parseShieldCatalog } from "./catalog-contract";
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
        {
          svgHash: asset.svgHash,
          version: asset.version,
          updatedAt: asset.updatedAt,
          asset: structuredClone(asset),
        },
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
  try {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(SHIELD_CATALOG_STORAGE_KEY);
      if (stored) {
        const parsed = parseShieldCatalog(JSON.parse(stored));
        if (parsed) return parsed;
      }
    }
  } catch {
    // Browser storage can throw even when reading its property.
  }
  return structuredClone(inMemoryCatalog);
}
/**
 * Salva o estado do catálogo no storage local e na memória.
 */
const storageError =
  "Não foi possível salvar a biblioteca neste navegador. O catálogo anterior foi preservado.";
function persistCatalog(state: ShieldCatalogState): boolean {
  // Commit memory only after durable browser storage succeeds.
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SHIELD_CATALOG_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    return false;
  }
  inMemoryCatalog = structuredClone(state);
  return true;
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
  if (!persistCatalog(catalog)) return { success: false, error: storageError };

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

  const normalizedVersion = newVersion.trim();
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(normalizedVersion)) {
    return { success: false, error: "Versão inválida. Utilize o formato semântico (ex: 1.1.0)." };
  }

  const catalog = getShieldCatalog();
  if (catalog.history.some((record) => record.version === normalizedVersion)) {
    return {
      success: false,
      error: "Esta versão já existe no histórico. Informe uma versão ainda não utilizada.",
    };
  }
  const now = new Date().toISOString();
  const publisher = userContext.userId || "Super ADM";

  // Promover todos os ativos para status "published" na nova versão
  for (const id of Object.keys(catalog.assets)) {
    const asset = catalog.assets[id]!;
    catalog.assets[id] = {
      ...asset,
      status: "published",
      version: normalizedVersion,
      publishedAt: now,
      publishedBy: publisher,
    };
  }

  const versionRecord: ShieldVersionRecord = {
    version: normalizedVersion,
    publishedAt: now,
    publishedBy: publisher,
    changeSummary: changeSummary.trim() || "Publicação de nova revisão de ativos de Escudos.",
    snapshot: Object.fromEntries(
      Object.entries(catalog.assets).map(([id, asset]) => [
        id,
        {
          svgHash: asset.svgHash,
          version: asset.version,
          updatedAt: asset.updatedAt,
          asset: structuredClone(asset),
        },
      ]),
    ),
  };

  catalog.version = normalizedVersion;
  catalog.publishedAt = now;
  catalog.publishedBy = publisher;
  catalog.history.unshift(versionRecord);

  if (!persistCatalog(catalog)) return { success: false, error: storageError };
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
  const matches = catalog.history.filter((h) => h.version === targetVersion);
  if (matches.length > 1) {
    return {
      success: false,
      error: "Histórico ambíguo: há mais de um registro desta versão. O catálogo foi preservado.",
    };
  }
  const targetRecord = matches[0];
  if (!targetRecord) {
    return { success: false, error: `Versão alvo '${targetVersion}' não encontrada no histórico.` };
  }

  // Validate every historical file before replacing any current asset.
  const restored: Record<string, ShieldArtAsset> = {};
  const now = new Date().toISOString();
  for (const id of Object.keys(catalog.assets)) {
    const snap = targetRecord.snapshot[id];
    const asset = snap?.asset;
    const validation = asset && validateAndSanitizeSvg(asset.svgContent);
    if (
      !asset ||
      !validation?.isValid ||
      validation.hash !== snap?.svgHash ||
      asset.svgHash !== snap.svgHash ||
      asset.version !== snap.version ||
      asset.id !== id ||
      asset.shieldId !== catalog.assets[id]?.shieldId ||
      asset.variant !== catalog.assets[id]?.variant ||
      asset.status !== "published"
    ) {
      return {
        success: false,
        error:
          "Esta versão não contém arquivos íntegros para restauração. O catálogo atual foi preservado.",
      };
    }
    restored[id] = {
      ...structuredClone(asset),
      updatedAt: now,
      updatedBy: `Rollback por ${userContext.userId || "Super ADM"}`,
    };
  }
  catalog.assets = restored;
  catalog.version = `${targetVersion}-revert`;
  catalog.publishedAt = now;
  catalog.publishedBy = `Rollback para ${targetVersion}`;

  if (!persistCatalog(catalog)) return { success: false, error: storageError };
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
  if (!persistCatalog(freshCatalog)) return { success: false, error: storageError };
  return { success: true, catalog: freshCatalog };
}
