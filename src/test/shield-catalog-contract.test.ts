import { beforeEach, expect, it } from "vitest";
import { parseShieldCatalog } from "@/features/super-admin/shields/catalog-contract";
import {
  createInitialCatalogState,
  getShieldCatalog,
  resetShieldCatalog,
  SHIELD_CATALOG_STORAGE_KEY,
} from "@/features/super-admin/shields/storage";

beforeEach(() => {
  localStorage.clear();
  resetShieldCatalog({ role: "super_admin", userId: "local-qa" });
});
it("accepts complete catalog and legacy history without embedded files", () => {
  const state = createInitialCatalogState();
  expect(parseShieldCatalog(state)).not.toBeNull();
  for (const item of Object.values(state.history[0]!.snapshot)) delete item.asset;
  expect(parseShieldCatalog(state)).not.toBeNull();
});
it.each(["hash", "identity", "missing-field", "foreign-key", "history"])(
  "rejects %s tampering despite having fifteen assets",
  (mode) => {
    const state = createInitialCatalogState();
    const item = state.assets["origem_active"]!;
    if (mode === "hash") item.svgContent = '<svg><circle r="1"/></svg>';
    if (mode === "identity") item.shieldId = "ritmo";
    if (mode === "missing-field") Reflect.deleteProperty(item, "accessibilityLabel");
    if (mode === "foreign-key") {
      state.assets["unexpected"] = item;
      delete state.assets["origem_active"];
    }
    if (mode === "history") Reflect.deleteProperty(state.history[0]!, "snapshot");
    expect(Object.keys(state.assets)).toHaveLength(15);
    expect(parseShieldCatalog(state)).toBeNull();
    const stored = JSON.stringify(state);
    localStorage.setItem(SHIELD_CATALOG_STORAGE_KEY, stored);
    expect(getShieldCatalog().assets["origem_active"]!.svgHash).toBe(
      createInitialCatalogState().assets["origem_active"]!.svgHash,
    );
    expect(localStorage.getItem(SHIELD_CATALOG_STORAGE_KEY)).toBe(stored);
  },
);
