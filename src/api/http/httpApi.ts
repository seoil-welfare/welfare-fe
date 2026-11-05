import { isApiError } from "@/api/errors";
import { request } from "@/api/http/client";
import type { Api, SaveDiaryInput } from "@/api/types";

/**
 * 실제 백엔드 구현. 경로는 제안안이며 docs/backend-integration.md와 함께 백엔드와 확정한다.
 */
export const httpApi: Api = {
  auth: {
    login: (input) => request("/auth/login", { method: "POST", body: input }),
    logout: () => request("/auth/logout", { method: "POST" }),
    signup: (input) => request("/auth/signup", { method: "POST", body: input }),
    me: async () => {
      try {
        return await request("/auth/me");
      } catch (error) {
        // 로그인하지 않은 상태는 오류가 아니라 null로 다룬다
        if (isApiError(error) && error.status === 401) return null;
        throw error;
      }
    },
    changePassword: (input) => request("/auth/password", { method: "PUT", body: input }),
  },
  diaries: {
    list: (query) => request("/diaries", { query: { ...query } }),
    get: (diaryId) => request("/diaries/" + encodeURIComponent(diaryId)),
    save: ({ diaryId, ...body }) =>
      diaryId
        ? request("/diaries/" + encodeURIComponent(diaryId), { method: "PUT", body })
        : request("/diaries", { method: "POST", body }),
  },
  calendar: {
    days: (query) => request("/calendar", { query: { ...query } }),
    clientStatuses: (date) => request("/calendar/days/" + encodeURIComponent(date)),
  },
  stats: {
    summary: (query) => request("/stats/summary", { query: { ...query } }),
  },
  news: {
    list: (query) => request("/news", { query: { ...query } }),
  },
  serviceUsers: {
    list: () => request("/service-users"),
    create: (input) => request("/service-users", { method: "POST", body: input }),
    update: (userId, input) =>
      request("/service-users/" + encodeURIComponent(userId), { method: "PUT", body: input }),
    close: (userId) =>
      request("/service-users/" + encodeURIComponent(userId) + "/close", { method: "POST" }),
  },
  staff: {
    list: () => request("/staff"),
    create: (input) => request("/staff", { method: "POST", body: input }),
    setActive: (staffId, active) =>
      request("/staff/" + encodeURIComponent(staffId) + (active ? "/activate" : "/deactivate"), {
        method: "POST",
      }),
    changeRole: (staffId, role) =>
      request("/staff/" + encodeURIComponent(staffId) + "/role", { method: "POST", body: { role } }),
    transferDirector: (staffId, previousRole) =>
      request("/staff/" + encodeURIComponent(staffId) + "/transfer-director", {
        method: "POST",
        body: { previousRole },
      }),
  },
  notifications: {
    summary: () => request("/notifications/summary"),
    markAllRead: () => request("/notifications/read", { method: "POST" }),
    settings: () => request("/notifications/settings"),
    updateSettings: (input) => request("/notifications/settings", { method: "PUT", body: input }),
  },
  categories: {
    list: () => request("/categories"),
    addParticipation: (label) => request("/categories/participation", { method: "POST", body: { label } }),
    updateParticipation: (code, input) =>
      request("/categories/participation/" + encodeURIComponent(code), { method: "PUT", body: input }),
  },
};

/**
 * 탭을 닫거나 새로고침하는 중(pagehide)에 쓰는 저장 요청 (QA 03-01).
 * 보통의 fetch는 페이지가 닫히면 끊길 수 있어 keepalive: true로 보낸다.
 * 응답이 와도 화면이 이미 사라진 뒤라 결과를 기다리거나 확인하지 않는다.
 */
export function saveDiaryBeforeUnload(input: SaveDiaryInput): void {
  const { diaryId, ...body } = input;
  const path = diaryId ? "/diaries/" + encodeURIComponent(diaryId) : "/diaries";
  void request(path, { method: diaryId ? "PUT" : "POST", body, keepalive: true }).catch(() => {
    // 결과를 확인할 수 없다. 다음에 들어오면 자동 저장이 다시 시도한다
  });
}
