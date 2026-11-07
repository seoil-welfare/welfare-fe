import { type Page } from "@playwright/test";
import { defaultCategories } from "../src/services/categoryService";
import { emptyActivity } from "../src/services/diaryService";
import { statsSummary } from "../src/services/statsService";
import type { Diary } from "../src/types";

export const TODAY = "2026-11-07";
export const users = [
  { id: "1", name: "가상 이용자", birthDate: "2000-01-01", assignedStaffId: "1", status: "active" },
  { id: "2", name: "종결 이용자", birthDate: "2001-01-01", assignedStaffId: "1", status: "closed" },
];
export const member = (role = "staff") => ({ id: "1", name: "가상 직원", role,
  loginId: "demo.staff1", department: "주간활동지원팀", position: "담당자", active: true });
export const diary = { id: "10", userId: "1", authorId: "1", date: TODAY, status: "completed",
  weather: "맑음", condition: "양호", notes: "특이사항을 기록했습니다. 긴 한국어 문장의 줄바꿈을 확인합니다.",
  activities: [{ ...emptyActivity("100"), startTime: "10:00", endTime: "10:30", detail: "활동 상세를 기록했습니다.", participation: ["예술활동"] }],
  createdAt: "2026-11-07T09:00:00+09:00", updatedAt: "2026-11-07T09:00:00+09:00" };
export const summary = () => statsSummary([], "1", { unit: "month", year: 2026, month: 11 });

export interface MockOptions {
  role?: string;
  stats?: ReturnType<typeof summary>;
  statsStatus?: number;
  users?: typeof users;
  saveStatus?: number;
  staff?: ReturnType<typeof member>[];
  news?: unknown[];
  diary?: typeof diary;
  diaries?: Diary[];
  categories?: ReturnType<typeof defaultCategories>;
}

/** 실제 FE를 실행하고 네트워크 경계만 제어한다. 호출·요청 내용도 검증한다. */
export async function mockApi(page: Page, options: MockOptions = {}) {
  const calls: { path: string; method: string; body: any }[] = [];
  const directory = structuredClone(options.users ?? users);
  const catalog = structuredClone(options.categories ?? defaultCategories());
  const currentDiary = structuredClone(options.diary ?? diary);
  await page.clock.install({ time: new Date(TODAY + "T12:00:00+09:00") });
  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, "");
    const method = request.method();
    const body = request.postDataJSON();
    calls.push({ path, method, body });
    let data: unknown = [];
    let status = 200;
    if (path === "/auth/me") data = member(options.role);
    else if (path === "/staff") data = method === "GET" ? options.staff ?? [member(options.role)] : { ...member(), ...body, temporaryPassword: "TempPass1234" };
    else if (path === "/service-users") data = directory;
    else if (/\/service-users\/\d+\/(close|reopen)$/.test(path)) {
      const target = directory.find((u) => u.id === path.split("/")[2])!;
      target.status = path.endsWith("reopen") ? "active" : "closed";
      data = target;
    }
    else if (path === "/categories") data = catalog;
    else if (path.startsWith("/categories/participation/") && method === "PUT") {
      const item = catalog.participation.find((entry) => entry.code === decodeURIComponent(path.split("/").pop()!))!;
      const previous = item.label;
      Object.assign(item, body);
      currentDiary.activities = currentDiary.activities.map((activity) => ({ ...activity, participation: activity.participation.map((label) => label === previous ? item.label : label) }));
      data = item;
    }
    else if (path === "/notifications/settings") data = { notifyNewLog: body?.notifyNewLog ?? false };
    else if (path === "/notifications/summary") data = { unreadCount: 0 };
    else if (path === "/news") data = options.news ?? [];
    else if (path === "/stats/summary") { status = options.statsStatus ?? 200; data = status === 200 ? options.stats ?? summary() : { code: "TEST_ERROR", message: "기록 조회 실패" }; }
    else if (path === "/diaries" && method === "GET") data = options.diaries ?? [];
    else if (path.startsWith("/diaries")) {
      status = options.saveStatus ?? 200;
      data = status === 200 ? { ...currentDiary, ...body, id: "10", updatedAt: "2026-11-07T12:00:01+09:00" } : { code: "TEST_ERROR", message: "저장 실패" };
    }
    else if (path === "/auth/password") { status = 204; data = undefined; }
    await route.fulfill({ status, contentType: "application/json", body: data === undefined ? undefined : JSON.stringify(data) });
  });
  return calls;
}

export async function openActivity(page: Page) {
  await page.goto("/diaries/new");
  await page.getByRole("link", { name: "활동 내용 추가" }).click();
}
