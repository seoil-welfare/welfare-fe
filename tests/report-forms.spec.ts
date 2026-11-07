import { test, expect } from "./fixtures";
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { DOMParser } from "@xmldom/xmldom";
import { diary, users, member, mockApi } from "./support";
import type { Diary, ServiceUser, Staff } from "../src/types";
import { dailyRecordData } from "../src/services/dailyRecordService";
import { monthlyRecordData } from "../src/services/monthlyRecordService";
import { reportDiaries } from "../src/services/exportService";
import { renderDailyRecordDocx, renderDailyRecordBundleDocx } from "../src/lib/export/dailyRecordDocx";
import { renderMonthlyRecordDocx } from "../src/lib/export/monthlyRecordDocx";

const client = users[0] as ServiceUser;
const daily = Uint8Array.from(readFileSync("src/assets/forms/daily-record.template.docx")).buffer;
const monthly = Uint8Array.from(readFileSync("src/assets/forms/monthly-record.template.docx")).buffer;
const zip = new PizZip(monthly);
const images = { totals: zip.file("word/media/image1.png")!.asUint8Array(), chart: zip.file("word/media/image2.png")!.asUint8Array() };
const input = (extra: Partial<Diary> = {}): Diary => ({ ...structuredClone(diary) as Diary, ...extra });
function contents(buffer: ArrayBuffer | Buffer) {
  const archive = new PizZip(buffer);
  const xml = archive.file("word/document.xml")!.asText();
  const errors: string[] = [];
  const doc = new DOMParser({ onError: (level, msg) => { if (level !== "warning") errors.push(msg); } }).parseFromString(xml, "application/xml");
  expect(errors).toEqual([]);
  const text = Array.from(doc.getElementsByTagName("w:t")).map((n) => n.textContent).join("");
  return { archive, xml, text, doc };
}
const removed = ["오늘의 주요 목표", "지원 결과/변화", "상황/선행사건", "인수인계", "다음 달 목표", "지원 후 안정·재참여", "김OO", "박OO", "개인물품 정리 및 하루 일정 확인"];
async function render(value: Diary, kind: "daily" | "monthly") {
  const blob = kind === "daily"
    ? renderDailyRecordDocx(daily, dailyRecordData(value, client, [member() as Staff]))
    : renderMonthlyRecordDocx(monthly, monthlyRecordData([value], client, 2026, 11, [member() as Staff]), images);
  return contents(await blob.arrayBuffer());
}

for (const kind of ["daily", "monthly"] as const) {
  test(`${kind} 01 입력 없는 양식 항목·예시 제거`, async () => {
    const { text, xml, archive } = await render(input(), kind);
    for (const phrase of removed) expect(text).not.toContain(phrase);
    for (const file of archive.file(/^word\/(?:header|footer)\d*\.xml$/)) {
      const document = new DOMParser().parseFromString(file.asText(), "application/xml");
      const text = Array.from(document.getElementsByTagName("w:t")).map((node) => node.textContent).join("");
      expect(text).toBe("");
    }
    expect(xml).not.toContain("w:txbxContent");
    expect(text).not.toMatch(/\{(?:clientName|remarks|summary\w+)\}/);
  });
  test(`${kind} 02 특이사항 원문·XML 특수문자 보존`, async () => {
    const note = '보호자 전달: A&B <관찰> "확인"';
    const { text } = await render(input({ notes: note }), kind);
    expect(text).toContain(note);
  });
  test(`${kind} 03 다중행·이모지·긴 한국어 기록 보존`, async () => {
    const note = "첫째 줄 🙂\n둘째 줄 " + "긴 특이사항 내용 ".repeat(100);
    const { text, xml } = await render(input({ notes: note }), kind);
    expect(text).toContain(note.replaceAll("\n", ""));
    expect(xml).toContain("<w:br/>");
  });
  test(`${kind} 04 실제 작성자 이름 사용`, async () => {
    const { text } = await render(input(), kind);
    expect(text).toContain("작성자: 가상 직원");
    const missing = input({ authorId: "unknown" });
    const data = kind === "daily" ? dailyRecordData(missing, client) : monthlyRecordData([missing], client, 2026, 11);
    expect("authorName" in data ? data.authorName : data.authorNames).toBe("");
  });
  test(`${kind} 05 원문이 아닌 결과·횟수를 만들지 않음`, async () => {
    const value = input();
    value.activities[0] = { ...value.activities[0], reaction: ["부분적 참여"], hasBehavior: true, behaviors: [{ type: "selfHarm", detailIds: ["sh-1"] }] };
    const { text } = await render(value, kind);
    expect(text).toContain("머리 때리기");
    expect(text).toContain("부분적 참여");
    expect(text).not.toMatch(/추가 안내 후|안정·재참여|머리 때리기 2회/);
  });
  test(`${kind} 06 기타 입력값·컨디션 보존`, async () => {
    const value = input({ condition: "기타", conditionOther: "오전 피로" });
    value.activities[0] = { ...value.activities[0], participation: ["기타"], participationOther: "지역 도서관 방문", reaction: ["기타"], reactionOther: "잠시 관찰" };
    const { text } = await render(value, kind);
    expect(text).toContain("기타(오전 피로)"); expect(text).toContain("기타(지역 도서관 방문)"); expect(text).toContain("기타(잠시 관찰)");
  });
  test(`${kind} 07 타 이용자·기간 외·작성중 제외`, () => {
    const good = input();
    const mixed = [good, input({ userId: "2", notes: "다른 이용자" }), input({ status: "draft", notes: "작성중" }), input({ date: "2026-10-31", notes: "다른 월" })];
    expect(reportDiaries(mixed, client.id, "2026-11-01", "2026-11-30")).toEqual([good]);
    const data = monthlyRecordData(mixed, client, 2026, 11);
    expect(data.summaryNotes).not.toMatch(/다른 이용자|작성중|다른 월/);
    if (kind === "daily") expect(() => dailyRecordData(mixed[1], client)).toThrow();
  });
  test(`${kind} 08 동일 날짜 최신 저장본만 출력`, () => {
    const old = input({ notes: "이전 내용", updatedAt: "2026-11-07T09:00:00+09:00" });
    const latest = input({ notes: "최종 저장 내용", updatedAt: "2026-11-07T10:00:00+09:00" });
    expect(reportDiaries([latest, old], client.id, "2026-11-01", "2026-11-30")).toEqual([latest]);
    expect(monthlyRecordData([latest, old], client, 2026, 11).firstHalf[6].remarks).toContain("최종 저장 내용");
  });
  test(`${kind} 09 빈 활동·특이사항은 빈칸`, async () => {
    const { text } = await render(input({ activities: [], notes: "" }), kind);
    expect(text).not.toMatch(/undefined|null|안정적으로|자발적 참여|추가 지원 필요/);
    if (kind === "monthly") {
      const data = monthlyRecordData([], client, 2028, 2);
      expect(data.secondHalf.at(-1)?.day).toBe(29);
      expect(data.firstHalf[0].count).toBe("");
    }
  });
  test(`${kind} 10 메뉴에서 실제 응답으로 DOCX 다운로드`, async ({ page }, testInfo) => {
    const value = input({ date: kind === "monthly" ? "2026-10-07" : diary.date, notes: "API에 저장된 이용자 특이사항 & 검증" });
    const payload = [value, input({ userId: "2", notes: "출력되면 안 되는 다른 이용자" }), input({ status: "draft", notes: "출력되면 안 되는 임시 일지" })];
    await mockApi(page, { diaries: payload });
    const requests: URL[] = [];
    page.on("request", (r) => { const url = new URL(r.url()); if (url.pathname === "/api/diaries") requests.push(url); });
    await page.goto("/mypage");
    const label = kind === "daily" ? "일별활동일지 출력" : "월별활동일지 출력";
    await page.getByRole("link", { name: label }).click();
    await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "출력 시작" }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toContain(kind === "daily" ? "일별활동일지.docx" : "월별활동일지.docx");
    const file = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(file);
    const { text, archive } = contents(readFileSync(file));
    expect(text).toContain(value.notes);
    expect(text).toContain(member().name);
    expect(text).not.toContain("출력되면 안 되는");
    for (const phrase of removed) expect(text).not.toContain(phrase);
    expect(requests).toHaveLength(1);
    expect(requests[0].searchParams.get("userId")).toBe(client.id);
    expect(requests[0].searchParams.get("status")).toBe("completed");
    if (kind === "monthly") {
      for (const image of ["image1.png", "image2.png"]) expect([...archive.file("word/media/" + image)!.asUint8Array().slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(archive.file("word/media/image1.png")!.asUint8Array()).not.toEqual(images.totals);
      expect(archive.file("word/media/image2.png")!.asUint8Array()).not.toEqual(images.chart);
    }
  });
}

test("일별 24:00와 여러 날짜의 양식을 모두 보존", async () => {
  const first = input(); first.activities[0].endTime = "24:00";
  const second = input({ date: "2026-11-06", notes: "전날 특이사항" });
  const records = reportDiaries([first, second], client.id, second.date, first.date).map((d) => dailyRecordData(d, client));
  const { text, doc } = contents(await renderDailyRecordBundleDocx(daily, records).arrayBuffer());
  expect(text).toContain("24:00"); expect(text).toContain("전날 특이사항");
  expect(text.indexOf("6일")).toBeLessThan(text.indexOf("7일"));
  expect(doc.getElementsByTagName("w:tbl").length).toBe(4);
});

for (const kind of ["diaries", "monthly"]) test(`${kind} 대상 일지가 없으면 다운로드 없이 안내`, async ({ page }) => {
  await mockApi(page, { diaries: [input({ status: "draft" })] });
  let downloads = 0; page.on("download", () => { downloads++; });
  await page.goto("/exports/" + kind);
  await page.getByRole("button", { name: "출력 시작" }).click();
  await expect(page.getByText(kind === "diaries" ? "이 기간에는 작성 완료된 일지가 없어요" : /일지가 없어 건너뜀:/)).toBeVisible();
  expect(downloads).toBe(0);
});
