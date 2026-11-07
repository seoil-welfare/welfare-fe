import { test, expect } from "./fixtures";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import PizZip from "pizzip";
import path from "node:path";
import { mockApi, diary, users } from "./support";
import type { Activity, Diary } from "../src/types";

// 인쇄 배치 검증 전용 데이터. 운영 이용자의 기록으로 제시하지 않는다.
const folder = path.resolve("../검증결과/인쇄검증");
const cases = ["기본 기록", "빈 활동과 특이사항", "활동 15개", "활동 30개", "한 행의 긴 내용", "여러 영역 행동", "긴 기타 입력", "특수문자와 줄바꿈", "여러 날짜", "한 달 전체 기록"];
const time = (minutes: number) => String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
function records(index: number): Diary[] {
  const base: Diary = { ...structuredClone(diary) as Diary, date: "2026-10-07", notes: `LAYOUT-${index + 1} 시작. 인쇄 배치 검증용 기록입니다. 끝.` };
  const activity: Activity = { ...base.activities[0], preSupport: ["활동안내", "모델링"], reaction: ["안정적 참여"], positiveSupport: ["언어적 칭찬"], detail: "배치 확인용 활동 내용입니다. 종이에 인쇄될 때 줄바꿈을 확인합니다." };
  base.activities = [activity];
  if (index === 1) { base.activities = []; base.notes += "\n활동 없이 저장한 특이사항입니다."; }
  if (index === 2 || index === 3) base.activities = Array.from({ length: index === 2 ? 15 : 30 }, (_, i) => ({ ...activity, id: "activity-" + i, startTime: time(i * 30), endTime: time((i + 1) * 30), detail: `${i + 1}번째 활동 기록.\n` + activity.detail }));
  if (index === 4) { activity.detail = "긴 활동 기록입니다. ".repeat(350) + "LONG-ROW-END"; base.notes = "긴 특이사항입니다. ".repeat(150) + "LONG-NOTES-END"; }
  if (index === 5) { activity.hasBehavior = true; activity.behaviors = [{ type: "selfHarm", detailIds: ["sh-1", "sh-2", "sh-9"] }, { type: "otherHarm", detailIds: ["oh-1", "oh-2", "oh-3", "oh-4"] }, { type: "destruction", detailIds: ["ds-1", "ds-2", "ds-4"] }, { type: "other", detailIds: [], otherText: "긴 기타 행동 관찰 기록" }]; }
  if (index === 6) { activity.participation = ["기타"]; activity.participationOther = "직접 입력한 긴 활동 이름 ".repeat(10); activity.preSupport = ["기타"]; activity.preSupportOther = "직접 기록한 지원 방법 ".repeat(15); activity.reaction = ["부분적 참여", "기타"]; activity.reactionOther = "반응을 직접 적었습니다. ".repeat(10); }
  if (index === 7) { activity.detail = '첫 줄 <내용> A&B "확인" 🙂\n둘째 줄은 한국어입니다.\n마지막 줄'; activity.startTime = "23:30"; activity.endTime = "24:00"; base.notes += '\n특수문자 <메모> & 줄바꿈\n마지막 메모'; }
  const days = index === 8 ? [3, 7, 20] : index === 9 ? Array.from({ length: 31 }, (_, i) => i + 1) : [7];
  return days.map((day) => ({ ...structuredClone(base), id: "d-" + day, date: "2026-10-" + String(day).padStart(2, "0"), notes: base.notes + (days.length > 1 ? `\n${day}일에 실제 저장된 검증용 특이사항. ` + "긴 문장의 인쇄 배치를 확인합니다. ".repeat(index === 9 ? 3 : 1) : "") }));
}

for (const kind of ["daily", "monthly"] as const) for (const [index, label] of cases.entries()) {
  test(`인쇄 ${kind} ${String(index + 1).padStart(2, "0")} ${label}`, async ({ page }) => {
    const entries = records(index);
    await mockApi(page, { diaries: entries });
    await page.goto(kind === "daily" ? "/exports/diaries" : "/exports/monthly");
    if (kind === "daily") {
      await page.getByLabel("시작일", { exact: true }).fill("2026-10-01");
      await page.getByLabel("종료일", { exact: true }).fill("2026-10-31");
    }
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "출력 시작" }).click();
    const downloaded = await pending;
    expect(await downloaded.failure()).toBeNull();
    mkdirSync(folder, { recursive: true });
    const stem = `${kind}-${String(index + 1).padStart(2, "0")}`;
    await downloaded.saveAs(path.join(folder, stem + ".docx"));
    const xml = new PizZip(readFileSync(path.join(folder, stem + ".docx"))).file("word/document.xml")!.asText();
    expect(xml.match(/<w:tblHeader(?:\s[^>]*)?\/>/g)?.length).toBeGreaterThanOrEqual(2);
    writeFileSync(path.join(folder, stem + ".json"), JSON.stringify({ kind, label, user: users[0], entries }, null, 2));
  });
}
