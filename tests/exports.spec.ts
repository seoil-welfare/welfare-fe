import { test, expect } from "./fixtures";
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { DOMParser } from "@xmldom/xmldom";
import { diary, users, mockApi } from "./support";
import type { Activity, BehaviorSelection, Diary, ServiceUser } from "../src/types";
import { countDiaryBehaviors } from "../src/services/diaryService";
import { behaviorLines, dailyRecordData } from "../src/services/dailyRecordService";
import { behaviorTotals, monthlyRecordData } from "../src/services/monthlyRecordService";
import { recordsFor, statsSummary } from "../src/services/statsService";
import { renderDailyRecordDocx } from "../src/lib/export/dailyRecordDocx";
import { renderMonthlyRecordDocx } from "../src/lib/export/monthlyRecordDocx";
import { bundleRangeError } from "../src/services/exportService";

const selection = (type: BehaviorSelection["type"], ids: string[] = [], otherText?: string): BehaviorSelection => ({ type, detailIds: ids, otherText });
const cases: { name: string; selections: BehaviorSelection[]; expected: number; disabled?: boolean }[] = [
  { name: "중복 세부", selections: [selection("selfHarm", ["sh-1", "sh-1"])], expected: 1 },
  { name: "빈 상위 기타", selections: [selection("other")], expected: 0 },
  { name: "공백 상위 기타", selections: [selection("other", [], "  ")], expected: 0 },
  { name: "행동 없음", selections: [selection("otherHarm", ["oh-1"])], expected: 0, disabled: true },
  { name: "영역별 같은 이름", selections: [selection("otherHarm", ["oh-4"]), selection("selfHarm", ["sh-9"])], expected: 2 },
  { name: "세부 기타", selections: [selection("selfHarm", ["sh-other"], "손톱 자극")], expected: 1 },
  { name: "중복 유형", selections: [selection("selfHarm", ["sh-1"]), selection("selfHarm", ["sh-1"])], expected: 1 },
  { name: "중복 상위 기타", selections: [selection("other", [], "소리"), selection("other", [], "다른 내용")], expected: 1 },
  { name: "유형만 선택", selections: [selection("destruction")], expected: 0 },
  { name: "여러 영역·세부", selections: [selection("otherHarm", ["oh-1", "oh-2"]), selection("selfHarm", ["sh-1"]), selection("other", [], "소리")], expected: 4 },
];
const dailyTemplate = Uint8Array.from(readFileSync("src/assets/forms/daily-record.template.docx")).buffer;
const monthlyTemplate = Uint8Array.from(readFileSync("src/assets/forms/monthly-record.template.docx")).buffer;
const original = new PizZip(monthlyTemplate);
const images = { totals: original.file("word/media/image1.png")!.asUint8Array(), chart: original.file("word/media/image2.png")!.asUint8Array() };

for (const sample of cases) {
  const input = { ...diary, activities: [{ ...diary.activities[0], hasBehavior: !sample.disabled, behaviors: sample.selections }] } as Diary;
  test(`12-05 ${sample.name} 일일·월간·통계 일치`, async () => {
    const summary = statsSummary([input], "1", { unit: "month", year: 2026, month: 11 });
    expect(countDiaryBehaviors(input)).toBe(sample.expected);
    expect(behaviorLines(input.activities[0])).toHaveLength(sample.expected);
    expect(behaviorTotals([input]).reduce((sum, item) => sum + item.count, 0)).toBe(sample.expected);
    expect(summary.behavior.count).toBe(sample.expected);
    const doc = renderDailyRecordDocx(dailyTemplate, dailyRecordData(input, users[0] as ServiceUser));
    const xml = new PizZip(await doc.arrayBuffer()).file("word/document.xml")!.asText();
    expect(xml).not.toMatch(/\{(?:time|behaviors|clientName)\}/);
    for (const line of behaviorLines(input.activities[0])) expect(xml).toContain(line);
  });
  test(`12-01 ${sample.name} 실제 응답 records 검증`, () => {
    const summary = statsSummary([input], "1", { unit: "month", year: 2026, month: 11 });
    expect(summary.behavior.records.reduce((sum, row) => sum + row.behaviors.length, 0)).toBe(sample.expected);
    const rows = recordsFor(summary, "all");
    expect(rows.reduce((sum, row) => sum + row.labels.length, 0)).toBe(sample.expected);
    for (const row of rows) { expect(row.diaryId).toBe(input.id); expect(row.activityId).toBe(input.activities[0].id); }
    expect(recordsFor(summary, "selfHarm").length).toBe(sample.disabled || !sample.selections.some((s) => s.type === "selfHarm" && s.detailIds.length) ? 0 : 1);
  });
  test(`09-01 ${sample.name} 월간 docx 숫자 단위`, async () => {
    const data = monthlyRecordData([input], users[0] as ServiceUser, 2026, 11);
    expect(data.summaryNotes).not.toMatch(/\d+회/);
    if (sample.expected) expect(data.summaryNotes).toContain("총 " + sample.expected + "건");
    const doc = renderMonthlyRecordDocx(monthlyTemplate, data, images);
    const xml = new PizZip(await doc.arrayBuffer()).file("word/document.xml")!.asText();
    expect(xml).not.toMatch(/\d+회/);
    expect(xml).not.toContain("{summaryNotes}");
    const document = new DOMParser().parseFromString(xml, "application/xml");
    const text = Array.from(document.getElementsByTagName("w:t")).map((node) => node.textContent).join("");
    expect(text).toContain(data.summaryNotes.replaceAll("\n", ""));
  });
}

const labels: [BehaviorSelection["type"], string, string][] = [
  ["otherHarm", "oh-1", "타해 때리기"], ["otherHarm", "oh-2", "타해 발로 차기"],
  ["otherHarm", "oh-3", "타해 물기"], ["otherHarm", "oh-4", "타해 꼬집기"],
  ["selfHarm", "sh-1", "자해 머리 때리기"], ["selfHarm", "sh-2", "자해 얼굴 때리기"],
  ["selfHarm", "sh-9", "자해 꼬집기"], ["destruction", "ds-1", "파괴행동 물건 던지기"],
  ["destruction", "ds-2", "파괴행동 물건 내리치기"], ["destruction", "ds-4", "파괴행동 물건 찢기"],
];
for (const [type, id, label] of labels) test(`09-02 ${label} 영역 보존`, () => {
  const activity = { ...diary.activities[0], hasBehavior: true, behaviors: [selection(type, [id])] } as Activity;
  const input = { ...diary, activities: [activity] } as Diary;
  expect(behaviorTotals([input])).toEqual([{ label, count: 1 }]);
  expect(monthlyRecordData([input], users[0] as ServiceUser, 2026, 11).firstHalf[6].behaviors).toBe(label + " 1건");
});

const ranges: [string, string, boolean][] = [
  ["2026-11-07", "2026-11-07", true], ["2026-08-08", "2026-11-07", true],
  ["2026-08-07", "2026-11-07", false], ["2026-11-01", "2026-11-08", false],
  ["", "2026-11-07", false], ["2026-11-01", "", false],
  ["2026-02-30", "2026-03-01", false], ["2026-11-07", "2026-11-01", false],
  ["2024-02-29", "2024-03-01", true], ["2026-10-01", "2026-11-07", true],
];
for (const [from, to, valid] of ranges) test(`09-03 출력 범위 ${from}/${to}`, () => {
  expect(bundleRangeError(from, to, "2026-11-07") === undefined).toBe(valid);
});
test("09-03 미래 종료일은 화면에서도 출력 차단", async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/exports/diaries");
  await expect(page.getByLabel("종료일", { exact: true })).toHaveAttribute("max", "2026-11-07");
  await page.getByLabel("종료일", { exact: true }).fill("2026-12-01");
  await expect(page.getByRole("button", { name: "출력 시작" })).toBeDisabled();
  expect(calls.filter((c) => c.path === "/diaries")).toHaveLength(0);
});
