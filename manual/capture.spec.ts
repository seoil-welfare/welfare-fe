import { test, expect } from "../tests/fixtures";
import { setup, shot, go, setTime } from "./support";

test("01 로그인과 홈", async ({ page }) => {
  const state = await setup(page, "staff", false);
  await page.goto("/login");
  await page.getByLabel("아이디", { exact: true }).fill("guide.staff");
  await page.getByLabel("비밀번호", { exact: true }).fill("GuideOnly1234");
  await page.getByRole("checkbox", { name: "자동 로그인" }).check();
  await shot(page, "01-login");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText("김예시", { exact: false }).first()).toBeVisible();
  await shot(page, "02-home");
  expect(state.calls.find((c) => c.path === "/auth/login")?.body.autoLogin).toBe(true);
});

test("02 기본 정보부터 활동·행동·작성 완료까지", async ({ page }) => {
  const state = await setup(page);
  await go(page, "/diaries/new");
  const weather = page.getByRole("group", { name: "날씨", exact: true });
  await weather.getByText("맑음", { exact: true }).locator("..").click();
  await page.getByRole("group", { name: "이용자 컨디션", exact: true }).getByText("양호", { exact: true }).locator("..").click();
  await shot(page, "03-diary-basic");
  await page.getByRole("link", { name: "활동 내용 추가" }).click();
  await setTime(page, "시작 시각", "10:00"); await setTime(page, "종료 시각", "10:30");
  await page.getByRole("group", { name: "참여 활동", exact: true }).getByText("예술활동", { exact: true }).locator("..").click();
  await page.getByRole("textbox", { name: "활동 상세 내용", exact: true }).fill("색종이로 계절 풍경을 꾸몄습니다. 재료를 직접 고르고 붙였습니다.");
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "04-activity-time");
  await page.getByRole("group", { name: "사전 지원", exact: true }).getByText("모델링", { exact: true }).locator("..").click();
  const reaction = page.getByRole("group", { name: "이용자 반응", exact: true });
  await reaction.getByText("안정적 참여", { exact: true }).locator("..").click();
  await reaction.evaluate((e) => { e.scrollIntoView({ block: "start" }); window.scrollBy(0, -85); });
  await shot(page, "05-activity-reaction");
  await page.getByRole("checkbox", { name: "있음", exact: true }).check();
  await page.getByRole("checkbox", { name: /^자해/ }).check();
  await expect(page).toHaveURL(/behaviors\/selfHarm$/);
  await page.getByRole("checkbox", { name: "머리 때리기", exact: true }).check();
  await shot(page, "06-behavior-detail");
  await page.getByRole("button", { name: "1개 선택 완료", exact: true }).click();
  await page.getByRole("checkbox", { name: "있음", exact: true }).evaluate((e) => { e.scrollIntoView({ block: "start" }); window.scrollBy(0, -100); });
  await shot(page, "07-behavior-selected");
  await page.getByRole("button", { name: "저장하고 다음 활동", exact: true }).click();
  await expect(page).toHaveURL(/\/diaries\/new$/);
  await page.getByRole("textbox", { name: "특이사항", exact: true }).fill("점심 전 휴식 시간을 요청했습니다. 귀가 때 보호자에게 활동 내용을 전달했습니다.");
  await page.getByRole("textbox", { name: "특이사항", exact: true }).scrollIntoViewIfNeeded();
  await shot(page, "08-diary-notes");
  await expect(page.getByRole("button", { name: /저장됨/ })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "09-draft-saved");
  await page.getByRole("button", { name: "작성 완료", exact: true }).click();
  await expect(page).toHaveURL(/\/diaries\/\d+$/);
  await expect(page.getByRole("button", { name: "수정하기", exact: true })).toBeVisible();
  expect(state.entries.some((d) => d.date === "2026-11-07" && d.userId === "1" && d.status === "completed")).toBe(true);
  await shot(page, "10-completed");
});

test("03 달력과 일지 조회", async ({ page }) => {
  await setup(page);
  await go(page, "/calendar");
  await expect(page.getByRole("button", { name: /김예시/ })).toBeVisible();
  await shot(page, "11-calendar");
  await go(page, "/diaries/10");
  await expect(page.getByRole("button", { name: "수정하기", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /10:00~10:30/ }).click();
  await shot(page, "12-diary-detail");
});

test("04 완료 일지 수정과 동시 수정 안내", async ({ page }) => {
  const state = await setup(page);
  await go(page, "/diaries/10");
  await page.getByRole("button", { name: "수정하기", exact: true }).click();
  await page.getByRole("textbox", { name: "특이사항", exact: true }).fill("추가로 관찰한 내용을 기록했습니다.");
  await shot(page, "13-diary-edit");
  state.setSaveError(409);
  await page.getByRole("button", { name: "수정 완료", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await shot(page, "14-conflict");
});

test("05 통계·기간·상세", async ({ page }) => {
  await setup(page);
  await go(page, "/stats");
  await expect(page.getByText(/작성 완료 일지 2건 기준/)).toBeVisible();
  await shot(page, "15-stats");
  await page.getByRole("button", { name: /2026년 11월/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByText("11월", { exact: true }).scrollIntoViewIfNeeded();
  await shot(page, "16-period");
  await page.getByRole("button", { name: "기간 적용", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await go(page, "/stats/behaviors");
  await expect(page.getByRole("heading", { name: "도전적 행동 상세", exact: true })).toBeVisible();
  await shot(page, "17-stats-behavior");
});

test("06 활동별 반응", async ({ page }) => {
  await setup(page);
  await go(page, "/stats/activities");
  await expect(page.getByRole("heading", { name: "참여 활동 상세", exact: true })).toBeVisible();
  await page.getByRole("heading", { name: "활동별 이용자 반응", exact: true }).evaluate((e) => { e.scrollIntoView({ block: "start" }); window.scrollBy(0, -85); });
  await shot(page, "18-stats-activity");
});

test("07 이용자 등록·정보 수정", async ({ page }) => {
  const state = await setup(page);
  await go(page, "/users"); await expect(page.getByText("김예시", { exact: true })).toBeVisible();
  await shot(page, "19-user-list");
  await page.getByRole("link", { name: "이용자 등록", exact: true }).click();
  await page.getByRole("textbox", { name: "이름", exact: true }).fill("박예시");
  await page.getByRole("textbox", { name: "생년월일", exact: true }).fill("2002-04-18");
  await shot(page, "20-user-new");
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await expect(page).toHaveURL(/\/users$/);
  expect(state.clients.some((u) => u.name === "박예시")).toBe(true);
});

test("08 이용자 종결과 재개", async ({ page }) => {
  const state = await setup(page, "teamLead");
  await go(page, "/users/1"); await expect(page.getByRole("button", { name: "종결", exact: true })).toBeVisible();
  await shot(page, "21-user-detail");
  await page.getByRole("button", { name: "종결", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible(); await shot(page, "22-user-close");
  await page.getByRole("alertdialog").getByRole("button", { name: "종결", exact: true }).click();
  await expect(page).toHaveURL(/\/users$/);
  expect(state.clients[0].status).toBe("closed");
  await go(page, "/users/1"); await expect(page.getByRole("button", { name: "이용 재개", exact: true })).toBeVisible();
  await shot(page, "23-user-closed");
  await page.getByRole("button", { name: "이용 재개", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "재개", exact: true }).click();
  await expect(page).toHaveURL(/\/users$/); expect(state.clients[0].status).toBe("active");
});

test("09 직원과 관리자 메뉴 차이", async ({ page }) => {
  await setup(page); await go(page, "/mypage");
  await expect(page.getByRole("link", { name: "일별활동일지 출력" })).toBeVisible();
  await expect(page.getByRole("link", { name: /담당자 목록/ })).toHaveCount(0);
  await shot(page, "24-mypage-staff");
  await page.getByRole("switch", { name: "새 일지 알림 받기" }).scrollIntoViewIfNeeded();
  await page.getByRole("switch", { name: "새 일지 알림 받기" }).click();
  await expect(page.getByRole("switch", { name: "새 일지 알림 받기" })).toBeChecked();
  await shot(page, "25-mypage-settings");
});

test("10 담당자 계정 추가", async ({ page }) => {
  const state = await setup(page, "teamLead"); await go(page, "/mypage");
  await page.getByRole("link", { name: /담당자 목록/ }).scrollIntoViewIfNeeded(); await shot(page, "26-mypage-manager");
  await page.getByRole("link", { name: /담당자 목록/ }).click();
  await expect(page.getByText("안내담당", { exact: true })).toBeVisible(); await shot(page, "27-staff-list");
  await go(page, "/staff/new");
  await page.getByLabel("이름", { exact: true }).fill("신규예시"); await page.getByLabel("아이디", { exact: true }).fill("guide.new");
  await shot(page, "28-staff-new");
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); await shot(page, "29-temp-password");
  expect(state.employees.some((s) => s.loginId === "guide.new")).toBe(true);
});

test("11 계정 관리", async ({ page }) => {
  const state = await setup(page, "teamLead"); await go(page, "/staff/1");
  await expect(page.getByRole("button", { name: /역할 변경/ })).toBeVisible();
  await shot(page, "30-staff-detail");
  await page.getByRole("button", { name: /역할 변경/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); await shot(page, "31-staff-role");
  await page.getByRole("radio", { name: /팀장/ }).check();
  await page.getByRole("button", { name: "변경하기", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(state.employees[0].role).toBe("teamLead");
  await page.getByRole("button", { name: /^임시 비밀번호 발급/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "발급", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "임시 비밀번호를 발급했어요" })).toBeVisible();
  expect(state.calls.some((c) => c.path === "/staff/1/reset-password")).toBe(true);
});

test("12 참여 활동 관리", async ({ page }) => {
  await setup(page, "teamLead"); await go(page, "/settings/participation");
  await expect(page.getByRole("textbox", { name: "추가할 활동 이름" })).toBeVisible();
  await shot(page, "32-participation");
  await page.getByRole("button", { name: "예술활동", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); await shot(page, "33-participation-edit");
});

test("13 일별·월별 보고서 다운로드", async ({ page }) => {
  await setup(page);
  await go(page, "/exports/diaries"); await expect(page.getByLabel("시작일", { exact: true })).toBeVisible(); await shot(page, "34-export-daily");
  const daily = page.waitForEvent("download"); await page.getByRole("button", { name: "출력 시작" }).click(); expect((await daily).suggestedFilename()).toContain("일별활동일지.docx");
  await go(page, "/exports/monthly"); await expect(page.getByRole("combobox", { name: "연도" })).toBeVisible(); await shot(page, "35-export-monthly");
  const monthly = page.waitForEvent("download"); await page.getByRole("button", { name: "출력 시작" }).click(); expect((await monthly).suggestedFilename()).toContain("월별활동일지.docx");
  await expect(page.getByText(/내려받음:/)).toBeVisible(); await shot(page, "36-export-result");
});

test("14 비밀번호와 로그아웃", async ({ page }) => {
  const state = await setup(page); await go(page, "/settings/password");
  await expect(page.getByLabel("현재 비밀번호", { exact: true })).toBeVisible(); await shot(page, "37-password");
  await page.getByLabel("현재 비밀번호", { exact: true }).fill("GuideOnly1234");
  await page.getByLabel("새 비밀번호", { exact: true }).fill("GuideNew1234");
  await page.getByLabel("새 비밀번호 확인", { exact: true }).fill("GuideNew1234");
  await page.getByRole("button", { name: "변경", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(state.calls.some((c) => c.path === "/auth/password")).toBe(true);
  await page.getByLabel("아이디", { exact: true }).fill("guide.staff");
  await page.getByLabel("비밀번호", { exact: true }).fill("GuideNew1234");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await go(page, "/mypage"); await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible(); await shot(page, "38-logout");
  await page.getByRole("alertdialog").getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/); expect(state.calls.some((c) => c.path === "/auth/logout")).toBe(true);
});

test("15 활동 삭제 확인", async ({ page }) => {
  await setup(page); await go(page, "/diaries/10");
  await page.getByRole("button", { name: "수정하기", exact: true }).click();
  await page.getByRole("button", { name: "10:00~10:30 활동 삭제", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible(); await shot(page, "39-activity-delete");
  await page.getByRole("alertdialog").getByRole("button", { name: "삭제", exact: true }).click();
  await expect(page.getByRole("button", { name: "10:00~10:30 활동 삭제", exact: true })).toHaveCount(0);
});

test("16 작성 중인 일지 삭제", async ({ page }) => {
  const state = await setup(page); await go(page, "/diaries/12");
  await page.getByRole("button", { name: "이어서 작성", exact: true }).click();
  await page.getByRole("button", { name: "작성 중인 일지 삭제", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible(); await shot(page, "40-draft-delete");
  await page.getByRole("alertdialog").getByRole("button", { name: "삭제", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(state.entries.some((d) => d.id === "12")).toBe(false);
});
