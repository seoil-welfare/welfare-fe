import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { api } from "@/api";
import { isApiError } from "@/api/errors";
import type {
  CalendarQuery,
  DiaryQuery,
  LoginInput,
  NotificationSettings,
  ParticipationUpdate,
  SaveDiaryInput,
  StatsQuery,
  ServiceUserInput,
  StaffInput,
  ChangeableRole,
  PreviousDirectorRole,
} from "@/api/types";
import { addDays, dateOf } from "@/lib/utils";
import { latestNewsDateBefore } from "@/services/diaryService";
import type { Diary } from "@/types";

/**
 * 서버 상태 훅.
 * 화면은 api를 직접 부르지 않고 이 훅을 쓴다. 저장 후 어떤 조회를 다시 불러올지도 여기서 정한다.
 */

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 404·권한 오류는 다시 시도해도 같으므로 재시도하지 않는다
        retry: (failureCount, error) =>
          !(isApiError(error) && error.status >= 400 && error.status < 500) && failureCount < 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // 저장(POST·PUT)은 자동 재시도하지 않는다. 서버에서는 성공했는데 응답만 유실된 경우
        // 재시도가 중복 생성을 만들 수 있고, 서버의 멱등성 지원은 확정되지 않았다.
        retry: false,
      },
    },
  });
}

/**
 * 저장 실패 후 서버 상태를 다시 불러온다.
 * 네트워크 오류는 '실패'가 아니라 '결과 모름'이다. 서버에는 저장됐을 수 있으므로
 * 화면이 서버 기준으로 다시 그려지게 해, 사용자가 확인한 뒤 다시 시도하게 한다.
 */
function refetchAfterFailure(client: QueryClient, keys: readonly (readonly string[])[]) {
  keys.forEach((queryKey) => void client.invalidateQueries({ queryKey }));
}

export const queryKeys = {
  me: ["auth", "me"] as const,
  diaries: ["diaries"] as const,
  diaryList: (query: DiaryQuery) => ["diaries", "list", query] as const,
  diary: (diaryId: string) => ["diaries", "detail", diaryId] as const,
  calendar: ["calendar"] as const,
  calendarDays: (query: CalendarQuery) => ["calendar", "days", query] as const,
  calendarDay: (date: string) => ["calendar", "day", date] as const,
  stats: ["stats"] as const,
  statsSummary: (query: StatsQuery) => ["stats", "summary", query] as const,
  news: ["news"] as const,
  newsSince: (since: string) => ["news", since] as const,
  serviceUsers: ["serviceUsers"] as const,
  staff: ["staff"] as const,
  notifications: ["notifications"] as const,
  notificationSummary: ["notifications", "summary"] as const,
  notificationSettings: ["notifications", "settings"] as const,
  categories: ["categories"] as const,
};

/* ---------- 인증 ---------- */

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: () => api.auth.me(), staleTime: Infinity });
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.auth.login(input),
    onSuccess: (staff) => {
      // 이전 사용자의 캐시가 남지 않게 비우고 새 사용자로 시작한다
      client.clear();
      client.setQueryData(queryKeys.me, staff);
    },
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      client.clear();
      client.setQueryData(queryKeys.me, null);
    },
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: api.auth.changePassword });
}

/* ---------- 조회 ---------- */

export function useServiceUsers() {
  return useQuery({ queryKey: queryKeys.serviceUsers, queryFn: () => api.serviceUsers.list() });
}

export function useStaffList() {
  return useQuery({ queryKey: queryKeys.staff, queryFn: () => api.staff.list() });
}

export function useDiaries(query: DiaryQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.diaryList(query),
    queryFn: () => api.diaries.list(query),
    enabled: options.enabled,
    // 달력 월 이동처럼 조건이 바뀌는 동안 이전 결과를 유지해 화면이 깜빡이지 않게 한다
    placeholderData: (previous) => previous,
  });
}

export function useDiary(diaryId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.diary(diaryId ?? ""),
    queryFn: () => api.diaries.get(diaryId!),
    enabled: Boolean(diaryId),
  });
}

export function useCalendarDays(query: CalendarQuery) {
  return useQuery({
    queryKey: queryKeys.calendarDays(query),
    queryFn: () => api.calendar.days(query),
    // 월을 옮기는 동안 이전 달 숫자를 유지해 달력이 깜빡이지 않게 한다
    placeholderData: (previous) => previous,
  });
}

export function useCalendarDay(date: string) {
  return useQuery({
    queryKey: queryKeys.calendarDay(date),
    queryFn: () => api.calendar.clientStatuses(date),
    placeholderData: (previous) => previous,
  });
}

export function useStatsSummary(query: StatsQuery) {
  return useQuery({
    queryKey: queryKeys.statsSummary(query),
    queryFn: () => api.stats.summary(query),
    enabled: Boolean(query.userId),
    placeholderData: (previous) => previous,
  });
}

export function useNews(since: string) {
  return useQuery({
    queryKey: queryKeys.newsSince(since),
    queryFn: () => api.news.list({ since }),
    placeholderData: (previous) => previous,
  });
}

/** 일지 선택 항목. 자주 바뀌지 않으므로 5분 동안 다시 묻지 않는다 */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => api.categories.list(),
    staleTime: 5 * 60_000,
  });
}

/* ---------- 알림 ---------- */

export function useNotificationSummary() {
  return useQuery({ queryKey: queryKeys.notificationSummary, queryFn: () => api.notifications.summary() });
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: queryKeys.notificationSettings,
    queryFn: () => api.notifications.settings(),
  });
}

/** 소식 화면을 열면 부른다. 종 아이콘의 점이 바로 사라지게 summary를 다시 불러온다 */
export function useMarkNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.notificationSummary }),
  });
}

export function useUpdateNotificationSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationSettings) => api.notifications.updateSettings(input),
    onSuccess: (settings) => client.setQueryData(queryKeys.notificationSettings, settings),
    onError: () => refetchAfterFailure(client, [queryKeys.notificationSettings]),
  });
}

/** 지난 소식을 찾을 때 한 번에 넓히는 범위(일). 소식이 없으면 다음 범위로 넓힌다 */
const OLDER_NEWS_SPANS = [7, 14, 28, 56, 112, 224, 365];

/**
 * before(미포함)보다 앞서 소식이 있는 가장 가까운 날짜를 찾는다. limit(포함)까지 없으면 null.
 * 지금 API는 since 이후 전체만 주므로, 범위를 넓혀 가며 서버에 묻는다.
 * 찾으면 그 날짜부터의 목록을 캐시에 넣어 두어 화면이 같은 요청을 다시 보내지 않게 한다.
 */
export async function findOlderNewsDate(
  client: QueryClient,
  options: { before: string; limit: string; filter: "all" | "created" | "updated" },
): Promise<string | null> {
  for (const span of OLDER_NEWS_SPANS) {
    const candidate = addDays(options.before, -span);
    const since = candidate < options.limit ? options.limit : candidate;
    const entries = await client.fetchQuery({
      queryKey: queryKeys.newsSince(since),
      queryFn: () => api.news.list({ since }),
    });
    const found = latestNewsDateBefore(entries, options.before, options.filter);
    if (found) {
      client.setQueryData(
        queryKeys.newsSince(found),
        entries.filter((entry) => dateOf(entry.event.occurredAt) >= found),
      );
      return found;
    }
    if (since === options.limit) return null;
  }
  return null;
}

/* ---------- 저장 ---------- */

export function useSaveDiary() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveDiaryInput) => api.diaries.save(input),
    onSuccess: (diary: Diary) => {
      client.setQueryData(queryKeys.diary(diary.id), diary);
      void client.invalidateQueries({ queryKey: queryKeys.diaries });
      void client.invalidateQueries({ queryKey: queryKeys.calendar });
      void client.invalidateQueries({ queryKey: queryKeys.stats });
      void client.invalidateQueries({ queryKey: queryKeys.news });
    },
    onError: () =>
      refetchAfterFailure(client, [
        queryKeys.diaries,
        queryKeys.calendar,
        queryKeys.stats,
        queryKeys.news,
      ]),
  });
}

export function useCreateServiceUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceUserInput) => api.serviceUsers.create(input),
    onSuccess: () => invalidateServiceUsers(client),
    onError: () => refetchAfterFailure(client, [queryKeys.serviceUsers, queryKeys.calendar]),
  });
}

export function useUpdateServiceUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: ServiceUserInput }) =>
      api.serviceUsers.update(userId, input),
    onSuccess: () => invalidateServiceUsers(client),
  });
}

export function useCloseServiceUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.serviceUsers.close(userId),
    onSuccess: () => invalidateServiceUsers(client),
  });
}

/** 달력은 이용자 이름·대상 인원을 서버에서 받으므로 이용자가 바뀌면 같이 다시 불러온다 */
function invalidateServiceUsers(client: QueryClient) {
  void client.invalidateQueries({ queryKey: queryKeys.calendar });
  return client.invalidateQueries({ queryKey: queryKeys.serviceUsers });
}

export function useCreateStaff() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffInput) => api.staff.create(input),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.staff }),
    onError: () => refetchAfterFailure(client, [queryKeys.staff]),
  });
}

/** 참여 활동이 바뀌면 일지 선택지와 통계(활동 이름)를 다시 불러온다 */
function invalidateCategories(client: QueryClient) {
  void client.invalidateQueries({ queryKey: queryKeys.stats });
  return client.invalidateQueries({ queryKey: queryKeys.categories });
}

export function useAddParticipation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => api.categories.addParticipation(label),
    onSuccess: () => invalidateCategories(client),
    onError: () => refetchAfterFailure(client, [queryKeys.categories]),
  });
}

export function useUpdateParticipation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ code, input }: { code: string; input: ParticipationUpdate }) =>
      api.categories.updateParticipation(code, input),
    onSuccess: () => invalidateCategories(client),
    onError: () => refetchAfterFailure(client, [queryKeys.categories]),
  });
}

export function useSetStaffActive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, active }: { staffId: string; active: boolean }) =>
      api.staff.setActive(staffId, active),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.staff }),
    onError: () => refetchAfterFailure(client, [queryKeys.staff]),
  });
}

export function useChangeStaffRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, role }: { staffId: string; role: ChangeableRole }) =>
      api.staff.changeRole(staffId, role),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.staff }),
    onError: () => refetchAfterFailure(client, [queryKeys.staff]),
  });
}

/**
 * 관리 권한 이양. 내 역할이 바뀌므로 me도 다시 받는다.
 * 계정 사용 중지를 골랐으면 서버가 세션을 끊었으니 로그아웃처럼 캐시를 비운다.
 * 다시 불러오면 401이 나서 세션 만료 팝업이 뜨기 때문에 invalidate하지 않는다.
 */
export function useTransferDirector() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, previousRole }: { staffId: string; previousRole: PreviousDirectorRole }) =>
      api.staff.transferDirector(staffId, previousRole),
    onSuccess: (result) => {
      if (result.previous.active === false) {
        client.clear();
        client.setQueryData(queryKeys.me, null);
        return;
      }
      client.setQueryData(queryKeys.me, result.previous);
      return client.invalidateQueries({ queryKey: queryKeys.staff });
    },
    onError: () => refetchAfterFailure(client, [queryKeys.staff, queryKeys.me]),
  });
}

/* ---------- 여러 조회를 한 번에 다루기 ---------- */

/**
 * 조건(달력 월·통계 기간 등)을 바꾸는 동안 이전 결과(placeholderData)를 보여 주는 조회는
 * 그 데이터로 새 조건을 계산하면 틀린 값이 나온다. 이런 화면은 갱신 중을 로딩으로 다룬다.
 */
export function treatPlaceholderAsPending(
  state: CombinedState,
  queries: readonly UseQueryResult<unknown>[],
): CombinedState {
  return { ...state, isPending: state.isPending || queries.some((q) => q.isPlaceholderData) };
}

export interface CombinedState {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/** 화면이 여러 조회에 의존할 때 로딩·실패를 한 번에 판단한다 */
export function combineQueries(queries: readonly UseQueryResult<unknown>[]): CombinedState {
  const failed = queries.find((q) => q.isError);
  return {
    isPending: queries.some((q) => q.isPending),
    isError: Boolean(failed),
    error: failed?.error,
    refetch: () => queries.filter((q) => q.isError).forEach((q) => void q.refetch()),
  };
}
