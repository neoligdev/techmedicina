import { beforeEach, expect, it } from "vitest";
import { calculateSvgHash } from "@/features/super-admin/shields/sanitizer";
import {
  getShieldCatalog,
  publishCatalogVersion,
  resetShieldCatalog,
  rollbackToVersion,
  SHIELD_CATALOG_STORAGE_KEY,
  updateShieldAsset,
} from "@/features/super-admin/shields/storage";

const userContext = { role: "super_admin", userId: "demo-operator" };
const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
beforeEach(() => {
  localStorage.clear();
  resetShieldCatalog(userContext);
});

it("restores actual SVG bytes and matching hash after editing and publishing", () => {
  const original = getShieldCatalog().assets["origem_active"]!;
  expect(updateShieldAsset({ assetId: original.id, rawSvg, userContext }).success).toBe(true);
  expect(
    publishCatalogVersion({ newVersion: "1.1.0", changeSummary: "Local QA", userContext }).success,
  ).toBe(true);
  expect(getShieldCatalog().assets[original.id]!.svgContent).toBe(rawSvg);
  expect(rollbackToVersion({ targetVersion: "1.0.0", userContext }).success).toBe(true);
  const restored = getShieldCatalog().assets[original.id]!;
  expect(restored.svgContent).toBe(original.svgContent);
  expect(restored.svgHash).toBe(calculateSvgHash(restored.svgContent));
  expect(restored.version).toBe("1.0.0");
});

it.each(["missing", "corrupt"])(
  "rejects %s historical file without partially changing current art",
  (mode) => {
    updateShieldAsset({ assetId: "origem_active", rawSvg, userContext });
    const state = getShieldCatalog();
    const snapshot = state.history[0]!.snapshot["plenitude_locked"]!;
    if (mode === "missing") delete snapshot.asset;
    else snapshot.asset!.svgContent = rawSvg;
    localStorage.setItem(SHIELD_CATALOG_STORAGE_KEY, JSON.stringify(state));
    const before = localStorage.getItem(SHIELD_CATALOG_STORAGE_KEY);
    expect(rollbackToVersion({ targetVersion: "1.0.0", userContext }).success).toBe(false);
    expect(localStorage.getItem(SHIELD_CATALOG_STORAGE_KEY)).toBe(before);
    expect(getShieldCatalog().assets["origem_active"]!.svgContent).toBe(rawSvg);
  },
);

it("return values cannot mutate the in-memory fallback or historical snapshots", () => {
  const state = resetShieldCatalog(userContext).catalog!;
  state.assets["origem_active"]!.svgContent = rawSvg;
  localStorage.clear();
  const read = getShieldCatalog();
  expect(read.assets["origem_active"]!.svgContent).not.toBe(rawSvg);
  read.history[0]!.snapshot["origem_active"]!.asset!.svgContent = rawSvg;
  expect(getShieldCatalog().history[0]!.snapshot["origem_active"]!.asset!.svgContent).not.toBe(
    rawSvg,
  );
});
