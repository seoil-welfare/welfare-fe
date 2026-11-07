import { test, expect } from "./fixtures";
import { mockApi } from "./support";
import { normalizeLoginId, loginIdError, passwordError } from "../src/services/accountValidation";

const ids: [string, boolean][] = [["", false], ["abc", false], ["한글아이디", false], ["name space", false],
  ["with@sign", false], ["x".repeat(51), false], ["ABC.DEF", true], ["valid-id", true], ["x".repeat(50), true], ["  Trim.Name  ", true]];
for (const [id, valid] of ids) test(`08-06 아이디 ${id || "빈칸"}`, async ({ page }) => {
  const calls = await mockApi(page, { role: "teamLead" });
  await page.goto("/staff/new");
  await page.getByLabel("이름", { exact: true }).fill("가상 직원");
  await page.getByLabel("아이디", { exact: true }).fill(id);
  await page.getByRole("button", { name: "추가", exact: true }).click();
  if (valid) {
    await expect(page.getByRole("dialog", { name: "계정을 추가했어요" })).toBeVisible();
    expect(calls.find((c) => c.path === "/staff" && c.method === "POST")?.body.loginId).toBe(normalizeLoginId(id));
  } else {
    await expect(page.getByLabel("아이디", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(calls.filter((c) => c.path === "/staff" && c.method === "POST")).toHaveLength(0);
  }
  expect(loginIdError(id) === undefined).toBe(valid);
});

const passwords: [string, boolean][] = [["1", false], ["short1", false], ["abcdefgh", false], ["12345678", false],
  ["Password 1", false], ["Password\t1", false], ["a1" + "가".repeat(24), false],
  ["Password1", true], ["a1" + "x".repeat(70), true], ["a1" + "가".repeat(23), true]];
for (const [password, valid] of passwords) test(`10-03 비밀번호 규칙 ${JSON.stringify(password)}`, async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto("/settings/password");
  await page.getByLabel("현재 비밀번호", { exact: true }).fill("OldPassword1");
  await page.getByLabel("새 비밀번호", { exact: true }).fill(password);
  await page.getByLabel("새 비밀번호 확인", { exact: true }).fill(password);
  await page.getByRole("button", { name: "변경", exact: true }).click();
  if (valid) {
    await expect(page).toHaveURL(/\/login$/);
    expect(calls.filter((c) => c.path === "/auth/password" && c.method === "PUT")).toHaveLength(1);
  } else {
    await expect(page.getByLabel("새 비밀번호 확인", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(calls.filter((c) => c.path === "/auth/password")).toHaveLength(0);
  }
  expect(passwordError(password) === undefined).toBe(valid);
});
