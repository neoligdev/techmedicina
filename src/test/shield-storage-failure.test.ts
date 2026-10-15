import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  getShieldCatalog,
  publishCatalogVersion,
  resetShieldCatalog,
  rollbackToVersion,
  updateShieldAsset,
} from "@/features/super-admin/shields/storage";
const userContext = { role: "super_admin", userId: "local-qa" };
const rawSvg = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="2"/></svg>';
beforeEach(() => {
  localStorage.clear();
  resetShieldCatalog(userContext);
});
afterEach(() => vi.restoreAllMocks());

it.each(["edit", "publish", "rollback", "reset"])(
  "%s reports storage failure and preserves stored and fallback state",
  (action) => {
    updateShieldAsset({ assetId: "origem_active", rawSvg, userContext });
    publishCatalogVersion({ newVersion: "1.1.0", changeSummary: "QA", userContext });
    const before = getShieldCatalog();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const result =
      action === "edit"
        ? updateShieldAsset({ assetId: "ritmo_active", rawSvg, userContext })
        : action === "publish"
          ? publishCatalogVersion({ newVersion: "1.2.0", changeSummary: "QA", userContext })
          : action === "rollback"
            ? rollbackToVersion({ targetVersion: "1.0.0", userContext })
            : resetShieldCatalog(userContext);
    expect(result.success).toBe(false);
    expect(result.error).toContain("catálogo anterior foi preservado");
    expect(getShieldCatalog()).toEqual(before);
    localStorage.clear();
    expect(getShieldCatalog()).toEqual(before);
  },
);

it("handles denied localStorage access without throwing or claiming a save", () => {
  const before = getShieldCatalog();
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("denied", "SecurityError");
  });
  expect(getShieldCatalog()).toEqual(before);
  expect(updateShieldAsset({ assetId: "origem_active", rawSvg, userContext }).success).toBe(false);
  expect(getShieldCatalog()).toEqual(before);
});
