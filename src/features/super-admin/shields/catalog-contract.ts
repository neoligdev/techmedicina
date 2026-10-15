import { z } from "zod";
import { SHIELD_IDS } from "@/features/journey/contracts";
import { validateAndSanitizeSvg, MAX_SVG_SIZE_BYTES } from "./sanitizer";

const text = z.string().min(1);
const instant = z.string().datetime({ offset: true });
const version = z.string().regex(/^\d+\.\d+\.\d+$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const asset = z
  .object({
    id: text,
    shieldId: z.enum(SHIELD_IDS),
    variant: z.enum(["active", "earned", "locked"]),
    name: text,
    description: text,
    themeColor: z.string().regex(/^#[a-fA-F0-9]{6}$/),
    svgContent: text.max(MAX_SVG_SIZE_BYTES),
    svgHash: hash,
    version,
    status: z.enum(["published", "draft"]),
    updatedAt: instant,
    updatedBy: text,
    publishedAt: instant.nullable(),
    publishedBy: text.nullable(),
    accessibilityLabel: text,
  })
  .strict();
const snapshot = z.record(
  z.object({ svgHash: hash, version, updatedAt: instant, asset: asset.optional() }).strict(),
);
const catalog = z
  .object({
    version: z.string().regex(/^\d+\.\d+\.\d+(-revert)?$/),
    publishedAt: instant,
    publishedBy: text,
    assets: z.record(asset),
    history: z
      .array(
        z
          .object({
            version,
            publishedAt: instant,
            publishedBy: text,
            changeSummary: text,
            snapshot,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
const ids = SHIELD_IDS.flatMap((id) =>
  ["active", "earned", "locked"].map((variant) => `${id}_${variant}`),
);
function completeKeys(value: Record<string, unknown>) {
  return Object.keys(value).length === ids.length && ids.every((id) => Object.hasOwn(value, id));
}

/** Local untrusted browser data only. This does not establish publication authority. */
export function parseShieldCatalog(value: unknown) {
  const parsed = catalog.safeParse(value);
  if (!parsed.success) return null;
  const state = parsed.data;
  if (!completeKeys(state.assets) || state.history.some((record) => !completeKeys(record.snapshot)))
    return null;
  for (const [id, item] of Object.entries(state.assets)) {
    if (id !== item.id || id !== `${item.shieldId}_${item.variant}`) return null;
    const validation = validateAndSanitizeSvg(item.svgContent);
    if (!validation.isValid || validation.hash !== item.svgHash) return null;
    if (item.status === "published" && (!item.publishedAt || !item.publishedBy)) return null;
  }
  return state;
}
