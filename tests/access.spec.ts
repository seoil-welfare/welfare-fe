import { test, expect } from "./fixtures";
import { mockApi } from "./support";

const routes = ["/staff", "/staff/new", "/staff/1", "/settings/participation"];
for (const role of ["staff", "teamLead", "director"]) {
  for (const path of routes) {
    test(`08-02 ${role} ${path}`, async ({ page }) => {
      await mockApi(page, { role });
      await page.goto(path);
      if (role === "staff") {
        await expect(page).toHaveURL(/\/mypage$/);
        await expect(page.getByRole("heading", { name: /담당자 관리|계정 추가|참여 활동 관리/ })).toHaveCount(0);
      } else {
        await expect(page).toHaveURL(path);
        await expect(page.getByRole("heading", { name: /담당자 관리|계정 추가|담당자 상세|참여 활동 관리/ }).first()).toBeVisible();
      }
    });
  }
}

for (const role of ["staff", "teamLead", "director"]) {
  for (const closed of [false, true]) {
    test(`07-01 ${role} ${closed ? "재개" : "종결"}`, async ({ page }) => {
      const calls = await mockApi(page, { role });
      await page.goto(closed ? "/users/2" : "/users/1");
      await expect(page.getByRole("heading", { name: "이용자 정보", exact: true })).toBeVisible();
      const action = page.getByRole("button", { name: closed ? "이용 재개" : "종결", exact: true });
      if (role === "staff") await expect(action).toHaveCount(0);
      else {
        await action.click();
        await page.getByRole("alertdialog").getByRole("button", { name: closed ? "재개" : "종결", exact: true }).click();
        await expect(page).toHaveURL(/\/users$/);
        expect(calls.some((c) => c.path.endsWith(closed ? "/reopen" : "/close") && c.method === "POST")).toBeTruthy();
      }
    });
  }
}
for (const role of ["staff", "teamLead", "director"]) {
  test(`07-01 ${role} 종결 목록 상세 접근`, async ({ page }) => {
    await mockApi(page, { role });
    await page.goto("/users");
    await page.getByRole("link", { name: /종결 이용자/ }).click();
    await expect(page.getByRole("link", { name: "지난 통계 보기" })).toBeVisible();
  });
}
test("07-01 종결 취소는 API를 부르지 않는다", async ({ page }) => {
  const calls = await mockApi(page, { role: "teamLead" });
  await page.goto("/users/1");
  await page.getByRole("button", { name: "종결", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "취소", exact: true }).click();
  expect(calls.filter((c) => c.path.endsWith("/close"))).toHaveLength(0);
});
