import { test, expect } from "./fixtures";
import { mockApi } from "./support";

for (const width of [360, 390, 768, 1366, 1920]) for (const target of ["notes", "activity"]) {
  test(`04-01 ${width} 완료 일지 ${target} 수정 중 새로고침 경고`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const calls = await mockApi(page);
    await page.goto("/diaries/10");
    await page.getByRole("button", { name: "수정하기", exact: true }).click();
    if (target === "activity") await page.getByRole("link", { name: /10:00~10:30/ }).click();
    const input = page.getByRole("textbox", { name: target === "notes" ? "특이사항" : "활동 상세 내용", exact: true });
    await input.fill("수정 중 입력 " + width);
    const prompt = page.waitForEvent("dialog", { timeout: 5_000 });
    await page.evaluate(() => { setTimeout(() => location.reload(), 0); });
    const dialog = await prompt;
    expect(dialog.type()).toBe("beforeunload");
    await dialog.dismiss();
    await expect(input).toHaveValue("수정 중 입력 " + width);
    expect(calls.filter((c) => c.path.startsWith("/diaries") && ["POST", "PUT"].includes(c.method))).toHaveLength(0);
  });
}
