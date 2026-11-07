import { test, expect } from "./fixtures";
import { mockApi, member, diary, openActivity } from "./support";

for (const width of [768, 820, 912, 1024, 1200, 1280, 1366, 1440, 1680, 1920]) {
  test(`02-01 ${width} PC 소식 행 높이`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await mockApi(page, { news: [{ event: { id: "n1", diaryId: "10", kind: "created", actorId: "1", occurredAt: "2026-11-07T09:00:00+09:00" }, diary: { id: "10", userId: "1", date: "2026-11-07" } }] });
    await page.goto("/home");
    const row = page.locator('main a[href="/diaries/10"]');
    await expect(row).toBeVisible();
    expect((await row.boundingBox())!.height).toBeLessThanOrEqual(100);
  });
}

for (const width of [320, 360, 375, 390, 414, 430, 480, 540, 600, 700]) {
  test(`02-02 ${width} 카드 넘김 44px 터치`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockApi(page);
    await page.goto("/home");
    const dots = page.getByRole("button", { name: /카드로 이동/ });
    await expect(dots.first()).toBeVisible();
    for (const dot of await dots.all()) {
      const box = (await dot.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await dots.last().click();
    await expect(dots.last()).toHaveAttribute("aria-current", "true");
  });
}

for (const width of [320, 360, 375, 390, 414, 480, 640, 768, 1366, 1920]) {
  test(`04-02 ${width} 특이사항·활동 상세 줄바꿈`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockApi(page);
    await page.goto("/diaries/10");
    await expect(page.getByText(diary.notes, { exact: true })).toHaveCSS("word-break", "keep-all");
    await page.getByRole("button", { name: /10:00~10:30/ }).click();
    const detail = page.getByText(diary.activities[0].detail, { exact: true });
    await expect(detail).toHaveCSS("word-break", "keep-all");
    expect(await detail.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy();
  });
  test(`08-04 ${width} 긴 담당자 아이디 전체 표시`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const loginId = "long.id_" + "x".repeat(42);
    await mockApi(page, { role: "teamLead", staff: [{ ...member("teamLead"), loginId }] });
    await page.goto("/staff");
    const text = page.getByText(loginId, { exact: false }).filter({ hasNot: page.locator("input") });
    await expect(text.first()).toBeVisible();
    expect(await text.first().evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
  test(`10-02 ${width} 알림 문구 클릭·키보드 조작`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const calls = await mockApi(page);
    await page.goto("/mypage");
    const control = page.getByRole("switch", { name: "새 일지 알림 받기" });
    await expect(control).toBeEnabled();
    await page.getByText("새 일지 알림 받기", { exact: true }).click();
    await expect(control).toBeChecked();
    await control.focus();
    await page.keyboard.press("Space");
    await expect(control).not.toBeChecked();
    expect(calls.filter((c) => c.path === "/notifications/settings" && c.method === "PUT").map((c) => c.body.notifyNewLog)).toEqual([true, false]);
  });
  test(`06-10 ${width} 서버·기본 선택지 동일 표기`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockApi(page);
    await openActivity(page);
    await expect(page.getByRole("checkbox", { name: "선택지 제공", exact: true })).toHaveCount(2);
    await expect(page.getByText("선택지제공", { exact: true })).toHaveCount(0);
  });
}
