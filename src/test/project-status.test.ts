import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { statusItems, deliveries, filterStatusItems } from "@/features/project-status/catalog";

describe("Temporary PRD project status", () => {
  it("covers every numbered section and subsection of the unchanged PRD", () => {
    const original = readFileSync(resolve("PRD_Techmedicina.md"), "utf8");
    const ids = Array.from(original.matchAll(/^#{2,3} (\d+(?:\.\d+)?)\.? /gm), (match) => match[1]);
    expect(statusItems.map((item) => item.id)).toEqual(ids);
    expect(statusItems.filter((item) => item.parent === null)).toHaveLength(34);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      statusItems.every(
        (item) =>
          item.done &&
          item.next &&
          (item.requirements.length > 0 || statusItems.some((child) => child.parent === item.id)),
      ),
    ).toBe(true);
  });
  it("does not mark demonstration as a completed production requirement", () => {
    expect(statusItems.some((item) => item.status === "done")).toBe(false);
    expect(statusItems.find((item) => item.id === "27.1")?.status).toBe("progress");
    expect(statusItems.find((item) => item.id === "27.6")?.status).toBe("pending");
    expect(deliveries.every((item) => item.status === "done" && item.authors.length > 0)).toBe(
      true,
    );
  });
  it("filters by status, author and accent-insensitive requirement text", () => {
    const matches = filterStatusItems(statusItems, "bioimpedancia", "progress");
    expect(matches.some((item) => item.id === "27.1")).toBe(true);
    expect(matches.every((item) => item.status === "progress")).toBe(true);
    expect(filterStatusItems(statusItems, "Codex", "all").some((item) => item.id === "8.1")).toBe(
      true,
    );
    expect(filterStatusItems(statusItems, "no-match-xyz", "all")).toEqual([]);
  });
});
