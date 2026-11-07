import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { defaultCategories } from "../src/services/categoryService";
import { emptyActivity, countDiaryBehaviors } from "../src/services/diaryService";
import { statsSummary } from "../src/services/statsService";
import type { Diary, Staff, ServiceUser, StatisticPeriod } from "../src/types";

export const folder = path.resolve("../사용자매뉴얼/제작자료/screens");
export const TODAY = "2026-11-07";
export async function setup(page: Page, role: Staff["role"] = "staff", loggedIn = true) {
  const employees: Staff[] = [
    { id: "1", name: "안내담당", role: "staff", loginId: "guide.staff", department: "주간활동지원팀", position: "담당자", active: true },
    { id: "2", name: "안내팀장", role: "teamLead", loginId: "guide.lead", department: "주간활동지원팀", position: "팀장", active: true },
    { id: "3", name: "안내국장", role: "director", loginId: "guide.director", department: "복지지원팀", position: "국장", active: true },
  ];
  let actor = employees.find((s) => s.role === role)!;
  const clients: ServiceUser[] = [
    { id: "1", name: "김예시", birthDate: "2000-03-15", assignedStaffId: "1", status: "active" },
    { id: "2", name: "이예시", birthDate: "1999-07-08", assignedStaffId: "1", status: "active" },
    { id: "3", name: "최예시", birthDate: "2001-01-20", assignedStaffId: "1", status: "closed" },
  ];
  const activity = { ...emptyActivity("100"), startTime: "10:00", endTime: "10:30", participation: ["예술활동"], detail: "색종이로 계절 풍경을 꾸몄습니다. 재료를 고르고 붙이는 과정에 참여했습니다.", preSupport: ["활동안내", "모델링"], reaction: ["안정적 참여"], positiveSupport: ["언어 촉진 및 격려"], hasBehavior: true, behaviors: [{ type: "selfHarm" as const, detailIds: ["sh-1"] }] };
  const base: Diary = { id: "10", userId: "1", authorId: "1", date: "2026-11-06", status: "completed", weather: "맑음", condition: "양호", activities: [activity], notes: "점심 전 휴식 시간을 요청하여 기록했습니다. 귀가 시 보호자에게 오늘 활동을 전달했습니다.", createdAt: "2026-11-06T15:00:00+09:00", updatedAt: "2026-11-06T15:30:00+09:00" };
  const entries: Diary[] = [base, { ...structuredClone(base), id: "11", date: "2026-10-07" }, { ...structuredClone(base), id: "12", userId: "2", date: TODAY, status: "draft", activities: [], notes: "오전 기록을 이어서 작성할 예정입니다." }, { ...structuredClone(base), id: "13", date: "2026-11-04", activities: [{ ...structuredClone(activity), id: "101", participation: ["체육활동"], reaction: ["적극적 참여"], hasBehavior: false, behaviors: [] }] }];
  const categories = structuredClone(defaultCategories());
  let notification = false;
  let version = 0;
  let saveError: undefined | number;
  const calls: { path: string; method: string; body: any }[] = [];
  await page.clock.install({ time: new Date(TODAY + "T12:00:00+09:00") });
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const req = route.request(), url = new URL(req.url());
    const pathname = url.pathname.replace(/^\/api/, ""), method = req.method(), body = req.postDataJSON();
    calls.push({ path: pathname, method, body });
    let data: unknown = [], status = 200;
    if (pathname === "/auth/me") { data = loggedIn ? actor : null; if (!loggedIn) { status = 401; data = { message: "로그인해 주세요." }; } }
    else if (pathname === "/auth/login") { loggedIn = true; data = actor; }
    else if (pathname === "/auth/logout" || pathname === "/auth/password") { loggedIn = false; status = 204; data = undefined; }
    else if (pathname === "/service-users" && method === "GET") data = clients;
    else if (pathname === "/service-users" && method === "POST") { const client = { ...body, id: "20", status: "active" } as ServiceUser; clients.push(client); data = client; }
    else if (/^\/service-users\/\d+/.test(pathname)) { const target = clients.find((u) => u.id === pathname.split("/")[2])!; if (pathname.endsWith("/close")) target.status = "closed"; else if (pathname.endsWith("/reopen")) target.status = "active"; else Object.assign(target, body); data = target; }
    else if (pathname === "/staff" && method === "GET") data = employees;
    else if (pathname === "/staff" && method === "POST") { const employee = { ...body, id: "20", active: true }; employees.push(employee); data = { ...employee, temporaryPassword: "GuideOnly1234" }; }
    else if (/^\/staff\/\d+/.test(pathname)) { const target = employees.find((s) => s.id === pathname.split("/")[2])!; if (pathname.endsWith("/deactivate")) target.active = false; if (pathname.endsWith("/activate")) target.active = true; if (pathname.endsWith("/role")) target.role = body.role; data = pathname.endsWith("/reset-password") ? { ...target, temporaryPassword: "GuideOnly1234" } : target; }
    else if (pathname === "/categories") data = categories;
    else if (pathname === "/categories/participation" && method === "POST") { const item = { code: "guide-activity", label: body.label, active: true, etc: false, order: 98 }; categories.participation.push(item); data = item; }
    else if (pathname.startsWith("/categories/participation/")) { const item = categories.participation.find((c) => c.code === decodeURIComponent(pathname.split("/").pop()!))!; Object.assign(item, body); data = item; }
    else if (pathname === "/notifications/settings") { if (body) notification = body.notifyNewLog; data = { notifyNewLog: notification }; }
    else if (pathname === "/notifications/summary") data = { unreadCount: 0 };
    else if (pathname === "/news") data = [{ event: { id: "news-1", diaryId: "10", kind: "updated", actorId: "1", occurredAt: TODAY + "T10:00:00+09:00" }, diary: { id: "10", userId: "1", date: "2026-11-06" } }];
    else if (pathname === "/calendar") data = [...new Set(entries.map((d) => d.date))].map((date) => ({ date, completed: entries.filter((d) => d.date === date && d.status === "completed").length, draft: entries.filter((d) => d.date === date && d.status === "draft").length, target: 2, hasBehavior: entries.some((d) => d.date === date && countDiaryBehaviors(d) > 0) }));
    else if (pathname.startsWith("/calendar/days/")) { const date = pathname.split("/").pop()!; data = clients.filter((c) => c.status === "active").map((c) => { const d = entries.find((d) => d.date === date && d.userId === c.id); return { clientId: c.id, clientName: c.name, status: d?.status ?? "none", diaryId: d?.id, authorId: d?.authorId, behaviorCount: d ? countDiaryBehaviors(d) : 0, canCreate: !d && date <= TODAY }; }); }
    else if (pathname === "/stats/summary") { const q = url.searchParams; const p: StatisticPeriod = { unit: (q.get("unit") ?? "month") as StatisticPeriod["unit"], year: Number(q.get("year") ?? 2026), month: Number(q.get("month") ?? 11), week: Number(q.get("week") ?? 1), quarter: Number(q.get("quarter") ?? 4) }; data = statsSummary(entries, q.get("userId") ?? "1", p); }
    else if (pathname === "/diaries" && method === "GET") data = entries.filter((d) => (!url.searchParams.get("userId") || d.userId === url.searchParams.get("userId")) && (!url.searchParams.get("from") || d.date >= url.searchParams.get("from")!) && (!url.searchParams.get("to") || d.date <= url.searchParams.get("to")!) && (!url.searchParams.get("status") || d.status === url.searchParams.get("status")));
    else if (pathname === "/diaries" || pathname.startsWith("/diaries/")) {
      const id = pathname.split("/")[2];
      if (method === "GET") data = entries.find((d) => d.id === id);
      else if (method === "DELETE") { const index = entries.findIndex((d) => d.id === id); if (index >= 0) entries.splice(index, 1); status = 204; data = undefined; }
      else if (saveError) { status = saveError; data = { code: status === 409 ? "DIARY_UPDATED_BY_OTHER" : "SAVE_ERROR", message: status === 409 ? "다른 사람이 먼저 수정했어요." : "저장하지 못했어요." }; }
      else { const previous = entries.find((d) => d.id === id); const saved = { ...base, ...previous, ...body, id: id ?? "101", authorId: previous?.authorId ?? actor.id, updatedAt: TODAY + "T12:00:" + String(++version).padStart(2, "0") + "+09:00" } as Diary; const index = entries.findIndex((d) => d.id === saved.id); if (index >= 0) entries[index] = saved; else entries.push(saved); data = saved; }
    }
    await route.fulfill({ status, contentType: "application/json", body: data === undefined ? undefined : JSON.stringify(data) });
  });
  return { entries, clients, employees, calls, setSaveError: (value?: number) => { saveError = value; } };
}

export async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[role='progressbar']")).toHaveCount(0);
  // 조작한 입력칸의 커서와 포커스를 정리한다. 화면 내용은 바꾸지 않는다.
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "모바일 화면 가로 넘침").toBeTruthy();
  mkdirSync(folder, { recursive: true });
  await page.screenshot({ path: path.join(folder, name + ".jpg"), type: "jpeg", quality: 77, fullPage: false, animations: "disabled" });
}
export async function go(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator("main")).toBeVisible();
}
export async function setTime(page: Page, label: string, time: string) {
  const [hour, minute] = time.split(":");
  await page.getByRole("combobox", { name: label + " 시", exact: true }).selectOption(hour);
  if (hour !== "24") await page.getByRole("combobox", { name: label + " 분", exact: true }).selectOption(minute);
}
