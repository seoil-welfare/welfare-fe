import { test, expect } from "./fixtures";
import { mockApi } from "./support";

for (const label of ["미술활동", "새 활동", "원예 활동", "음악 감상", "요리 체험", "지역 산책", "독서", "운동", "공예", "감각 활동"]) {
  test(`08-03 이름 변경 ${label} 열린 일지 선택 유지`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await mockApi(page, { role: "teamLead" });
    await page.goto("/diaries/10");
    await page.getByRole("button", { name: "수정하기", exact: true }).click();
    await expect(page.getByRole("link", { name: /10:00~10:30/ })).toContainText("예술활동");
    await page.getByRole("link", { name: "마이페이지", exact: true }).first().click();
    await page.locator('a[href="/settings/participation"]').click();
    await page.getByRole("button", { name: "예술활동", exact: true }).click();
    await page.getByLabel("활동 이름", { exact: true }).fill(label);
    await page.getByRole("button", { name: "이름 저장", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.goBack();
    await page.goBack();
    await expect(page.getByRole("link", { name: /10:00~10:30/ })).toContainText(label);
    await page.getByRole("link", { name: /10:00~10:30/ }).click();
    await expect(page.getByRole("checkbox", { name: label, exact: true })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "예술활동", exact: true })).toHaveCount(0);
  });
}
