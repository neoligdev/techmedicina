import { beforeEach, expect, it } from "vitest";
import {
  getShieldCatalog,
  publishCatalogVersion,
  resetShieldCatalog,
  rollbackToVersion,
  SHIELD_CATALOG_STORAGE_KEY,
} from "@/features/super-admin/shields/storage";
const userContext = { role: "super_admin", userId: "local-qa" };
beforeEach(() => {
  localStorage.clear();
  resetShieldCatalog(userContext);
});
it("normalizes surrounding spaces and refuses reuse even after rollback", () => {
  const publish = (newVersion: string) =>
    publishCatalogVersion({ newVersion, changeSummary: "QA", userContext });
  expect(publish(" 1.1.0 ").success).toBe(true);
  expect(getShieldCatalog().version).toBe("1.1.0");
  const before = getShieldCatalog();
  expect(publish("1.1.0").success).toBe(false);
  expect(getShieldCatalog()).toEqual(before);
  expect(rollbackToVersion({ targetVersion: "1.0.0", userContext }).success).toBe(true);
  expect(publish("1.1.0").success).toBe(false);
});
it.each(["01.1.0", "1.01.0", "1.1.00"])(
  "rejects noncanonical version %s without mutation",
  (newVersion) => {
    const before = getShieldCatalog();
    expect(publishCatalogVersion({ newVersion, changeSummary: "QA", userContext }).success).toBe(
      false,
    );
    expect(getShieldCatalog()).toEqual(before);
  },
);
it("legacy duplicate history cannot silently select one rollback target", () => {
  const state = getShieldCatalog();
  state.history.push(structuredClone(state.history[0]!));
  const stored = JSON.stringify(state);
  localStorage.setItem(SHIELD_CATALOG_STORAGE_KEY, stored);
  const result = rollbackToVersion({ targetVersion: "1.0.0", userContext });
  expect(result.success).toBe(false);
  expect(result.error).toContain("ambíguo");
  expect(localStorage.getItem(SHIELD_CATALOG_STORAGE_KEY)).toBe(stored);
});
