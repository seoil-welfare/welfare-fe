import { test, expect } from "./fixtures";
import { mockApi, summary, users } from "./support";
import { selectFocusActivity } from "../src/services/statsService";

for (const path of ["unknown", "__proto__", "constructor", "prototype", "toString", "null", "undefined", "weather", "all", "없는분류"]) {
  test(`11-04 없는 분류 ${path}`, async ({ page }) => {
    const calls = await mockApi(page);
    await page.goto("/stats/" + encodeURIComponent(path));
    await expect(page.getByRole("heading", { name: "찾을 수 없는 화면" })).toBeVisible();
    expect(calls.filter((c) => c.path === "/stats/summary")).toHaveLength(0);
  });
}

for (const path of ["behaviors", "activities", "reaction", "preSupport", "condition"]) {
  for (const width of [360, 1366]) {
    test(`06-06 ${path} ${width} 기간 한 번 표시`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await mockApi(page);
      await page.goto("/stats/" + path);
      await expect(page.getByRole("button", { name: "2026년 11월", exact: true })).toBeVisible();
      await expect(page.getByText("2026년 11월", { exact: true })).toHaveCount(1);
    });
  }
}

for (const status of [400, 403, 404, 408, 409, 422, 429, 500, 502, 503]) {
  test(`11-07 조회 ${status} 실패는 0건 안내 없음`, async ({ page }) => {
    await mockApi(page, { statsStatus: status });
    await page.goto("/stats");
    await expect(page.getByRole("button", { name: "다시 시도", exact: true })).toBeVisible({ timeout: 12_000 });
    await expect(page.getByText(/작성 완료 일지 .*건 기준/)).toHaveCount(0);
    await expect(page.getByText("기록 조회 실패", { exact: true })).toBeVisible();
  });
}

for (let index = 0; index < 10; index++) {
  test(`06-05 기본 활동/유효 선택 ${index}`, async () => {
    const data = summary();
    const labels = ["일상생활훈련", "예술활동", "새 활동 " + index];
    const counts = [0, index + 1, index + 3];
    data.participation = labels.map((label, i) => ({ label, count: counts[i] }));
    data.activities.reactionByParticipation = labels.map((label) => ({ label, reaction: [] }));
    expect(selectFocusActivity(data)).toBe(labels[2]);
    expect(selectFocusActivity(data, labels[0])).toBe(labels[0]); // 명시적으로 고른 0건 활동은 유지
    expect(selectFocusActivity(data, "사라진 활동")).toBe(labels[2]);
    data.participation = data.participation.map((item) => ({ ...item, count: 0 }));
    expect(selectFocusActivity(data)).toBe(labels[0]);
    data.activities.reactionByParticipation = [];
    expect(selectFocusActivity(data)).toBe("");
  });
}

for (const role of ["staff", "teamLead", "director"]) {
  for (const width of [360, 1366]) {
    test(`06-09 ${role} ${width} 종결 이용자 조회`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const calls = await mockApi(page, { role });
      await page.goto("/stats?userId=2&includeClosed=true");
      await expect(page.getByRole("combobox", { name: "통계 조회 이용자" })).toContainText("종결 이용자");
      await expect(page.getByRole("checkbox", { name: "종결 이용자 포함" })).toBeChecked();
      await page.getByRole("checkbox", { name: "종결 이용자 포함" }).uncheck();
      await expect(page.getByRole("combobox", { name: "통계 조회 이용자" })).toContainText("가상 이용자");
      expect(calls.some((c) => c.path === "/stats/summary")).toBeTruthy();
    });
  }
}
for (const scenario of ["allClosed", "invalidId", "empty", "link"]) {
  test(`06-09 ${scenario}`, async ({ page }) => {
    await mockApi(page, { users: scenario === "empty" ? [] : scenario === "allClosed" ? [users[1]] : users });
    if (scenario === "link") {
      await page.goto("/users/2");
      await page.getByRole("link", { name: "지난 통계 보기" }).click();
      await expect(page.getByRole("combobox", { name: "통계 조회 이용자" })).toContainText("종결 이용자");
    } else {
      await page.goto("/stats?userId=missing");
      if (scenario === "empty") await expect(page.getByText(/통계를 볼 이용자가 없어요/)).toBeVisible();
      else if (scenario === "allClosed") {
        await page.getByRole("button", { name: "종결 이용자 포함" }).click();
        await expect(page.getByRole("combobox", { name: "통계 조회 이용자" })).toContainText("종결 이용자");
      } else await expect(page.getByRole("combobox", { name: "통계 조회 이용자" })).toContainText("가상 이용자");
    }
  });
}

for (const width of [320, 360, 375, 390, 414, 480, 640, 768, 1366, 1920]) {
  test(`06-07 ${width} 통계 카드 넘침 없음`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockApi(page);
    await page.goto("/stats/activities");
    const description = page.getByText("활동 종류", { exact: true });
    await expect(description).toBeVisible();
    expect(await description.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
}
