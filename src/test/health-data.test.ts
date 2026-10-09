import { describe, expect, it } from "vitest";
import {
  bodyHistory,
  latestBody,
  braceletReading,
  activityHistory,
  heartHistory,
  bmi,
  demoProfile,
  formatNumber,
  formatReadingTime,
} from "@/features/demo/health-data";

describe("Shared patient and physician demonstration data", () => {
  it("keeps latest body values aligned with the chronological history and profile", () => {
    expect(bodyHistory).toHaveLength(8);
    expect(latestBody).toEqual(bodyHistory.at(-1));
    expect(bmi).toBeCloseTo(latestBody.weight / demoProfile.height ** 2);
    bodyHistory.forEach((reading, index) => {
      expect(Number.isFinite(reading.weight)).toBe(true);
      if (index)
        expect(Date.parse(reading.at)).toBeGreaterThan(Date.parse(bodyHistory[index - 1]!.at));
    });
  });
  it("keeps bracelet summaries consistent with activity and heart histories", () => {
    expect(braceletReading.steps).toBe(activityHistory.at(-1)?.steps);
    expect(braceletReading.bpm).toBe(heartHistory.at(-1)?.bpm);
    expect(braceletReading.sleepMinutes / 60).toBeCloseTo(activityHistory.at(-1)!.sleep);
    expect(activityHistory).toHaveLength(7);
  });
  it("formats numbers and timestamps in Brazilian notation independently of host timezone", () => {
    expect(formatNumber(78.4)).toBe("78,4");
    expect(formatNumber(6420, 0)).toBe("6.420");
    expect(formatReadingTime(latestBody.at)).toContain("09/10/2026");
    expect(formatReadingTime(latestBody.at)).toContain("07:30");
  });
});
