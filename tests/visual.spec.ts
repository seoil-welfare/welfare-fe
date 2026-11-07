import { test, expect } from "./fixtures";
import { mockApi, openActivity, member } from "./support";
import { resolve } from "node:path";

for (const sample of [
  { width: 360, path: "/stats/activities", name: "통계" },
  { width: 390, path: "activity", name: "활동시간" },
  { width: 1366, path: "/home", name: "홈" },
  { width: 1920, path: "/staff", name: "담당자" },
]) test(`화면 검토 ${sample.name} ${sample.width}`, async ({ page }) => {
  await page.setViewportSize({ width: sample.width, height: 900 });
  await mockApi(page, { role: "teamLead", staff: [{ ...member("teamLead"), loginId: "long.id_" + "x".repeat(42) }] });
  if (sample.path === "activity") await openActivity(page); else await page.goto(sample.path);
  await expect(page.locator("main")).toBeVisible();
  await page.screenshot({ path: resolve("../검증결과/" + sample.name + "_" + sample.width + ".png"), fullPage: true, animations: "disabled" });
});
