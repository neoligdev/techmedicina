import { afterEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { calculateSvgHash, validateAndSanitizeSvg } from "@/features/super-admin/shields/sanitizer";
import { buildDefaultShieldCatalog } from "@/features/super-admin/shields/default-assets";

afterEach(() => vi.unstubAllGlobals());

it("builds all default arts without Node Buffer and preserves SHA-256 identities", () => {
  vi.stubGlobal("Buffer", undefined);
  const catalog = buildDefaultShieldCatalog();
  expect(Object.values(catalog)).toHaveLength(15);
  for (const asset of Object.values(catalog)) {
    const expected = createHash("sha256").update(asset.svgContent.trim(), "utf8").digest("hex");
    expect(asset.svgHash).toBe(expected);
    expect(validateAndSanitizeSvg(asset.svgContent)).toMatchObject({
      isValid: true,
      hash: expected,
    });
  }
});

it("hashes UTF-8 and bounds SVG byte size without Node APIs", () => {
  vi.stubGlobal("Buffer", undefined);
  const text = "  Origem — equilíbrio 💚  ";
  expect(calculateSvgHash(text)).toBe(createHash("sha256").update(text.trim()).digest("hex"));
  expect(validateAndSanitizeSvg(`<svg>${"é".repeat(132000)}</svg>`).isValid).toBe(false);
});
