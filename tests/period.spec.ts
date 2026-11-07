import { test, expect } from "./fixtures";
import { currentPeriod, periodRange, previousPeriod, trendPeriods, weekCountOfMonth } from "../src/services/statsService";
import { addDays } from "../src/lib/utils";

const cases = [
  [2025, 2, "2025-01-26", "2025-02-01"], [2026, 11, "2026-11-01", "2026-11-07"],
  [2026, 1, "2025-12-28", "2026-01-03"], [2024, 2, "2024-01-28", "2024-02-03"],
  [2024, 3, "2024-02-25", "2024-03-02"], [2025, 3, "2025-02-23", "2025-03-01"],
  [2026, 8, "2026-07-26", "2026-08-01"], [2026, 5, "2026-04-26", "2026-05-02"],
  [2027, 1, "2026-12-27", "2027-01-02"], [2028, 2, "2028-01-30", "2028-02-05"],
] as const;
for (const [year, month, start, end] of cases) {
  test(`06-08 ${year}-${month} 월 경계·윤년·연 경계 7일`, () => {
    expect(periodRange({ unit: "week", year, month, week: 1 })).toMatchObject({ start, end });
    for (let week = 1; week <= weekCountOfMonth(year, month); week++) {
      const period = { unit: "week" as const, year, month, week };
      const range = periodRange(period);
      expect(range.end).toBe(addDays(range.start, 6));
      expect(periodRange(previousPeriod(period)).start).toBe(addDays(range.start, -7));
      const trend = trendPeriods(period).map(periodRange);
      expect(new Set(trend.map((r) => r.start)).size).toBe(6);
      for (let i = 1; i < trend.length; i++) expect(trend[i].start).toBe(addDays(trend[i - 1].end, 1));
      expect(periodRange(currentPeriod("week", range.start)).start).toBe(range.start);
    }
  });
}
