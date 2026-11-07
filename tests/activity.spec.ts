import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { mockApi, openActivity } from "./support";
import { activityMinutes, activityTimeError } from "../src/services/activityTime";
import { emptyActivity } from "../src/services/diaryService";

async function setTime(page: Page, label: string, time: string) {
  const [hour, minute] = time.split(":");
  await page.getByRole("combobox", { name: label + " 시", exact: true }).selectOption(hour);
  if (hour !== "24") await page.getByRole("combobox", { name: label + " 분", exact: true }).selectOption(minute);
}

const times = [["00:00", "00:01"], ["00:00", "24:00"], ["09:00", "10:00"], ["17:00", "18:00"],
  ["23:59", "24:00"], ["12:15", "13:45"], ["10:00", "11:00"], ["01:01", "01:59"], ["18:30", "21:17"], ["22:45", "23:55"]];
for (const [start, end] of times) {
  test(`03-08 ${start}~${end} 독립 선택과 저장`, async ({ page }) => {
    await mockApi(page);
    await openActivity(page);
    await setTime(page, "시작 시각", start);
    await setTime(page, "종료 시각", end);
    if (end === "24:00") await expect(page.getByRole("combobox", { name: "종료 시각 분", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "저장하고 다음 활동" }).click();
    await expect(page).toHaveURL(/\/diaries\/new$/);
    await expect(page.getByText(start + "~" + end, { exact: true })).toBeVisible();
  });
}

for (const [start, end] of [["", ""], ["", "12:00"], ["12:00", ""], ["12:00", "12:00"], ["13:00", "12:00"],
  ["24:00", "24:00"], ["25:00", "26:00"], ["10:60", "11:00"], ["9:00", "10:00"], ["12:00", "24:01"]]) {
  test(`03-08 잘못된 시간 ${start}/${end}`, async () => {
    const activity = { ...emptyActivity("a"), startTime: start, endTime: end };
    expect(activityTimeError(activity, [])).toBeTruthy();
    expect(activityMinutes("24:00", true)).toBe(1440);
  });
}

for (let index = 0; index < 10; index++) {
  test(`03-08 겹침·인접·자기 수정 ${index}`, async () => {
    const a = { ...emptyActivity("a"), startTime: "10:00", endTime: "11:00" };
    const other = { ...a, id: "b", startTime: "10:" + String(index).padStart(2, "0"), endTime: "12:00" };
    expect(activityTimeError(a, [other])).toContain("겹쳐요");
    expect(activityTimeError(a, [{ ...other, startTime: "11:00" }])).toBeUndefined();
    expect(activityTimeError(a, [a])).toBeUndefined();
  });
}

const reactions = ["적극적 참여", "안정적 참여", "부분적 참여", "참여하지 않음"];
for (const first of reactions) for (const second of reactions.filter((value) => value !== first)) {
  test(`03-07 ${first}에서 ${second}로 변경·기타 유지`, async ({ page }) => {
    await mockApi(page);
    await openActivity(page);
    const group = page.getByRole("group", { name: "이용자 반응", exact: true });
    await group.evaluate((element) => element.scrollIntoView({ block: "center" }));
    await group.getByText(first, { exact: true }).locator("..").click();
    await group.getByText("기타", { exact: true }).locator("..").click();
    await group.getByText(second, { exact: true }).locator("..").click();
    await expect(group.getByRole("radio", { name: first, exact: true })).not.toBeChecked();
    await expect(group.getByRole("radio", { name: second, exact: true })).toBeChecked();
    await expect(group.getByRole("checkbox", { name: "기타", exact: true })).toBeChecked();
    await group.getByText("기타", { exact: true }).locator("..").click();
    await expect(group.getByRole("radio", { name: second, exact: true })).toBeChecked();
  });
}
