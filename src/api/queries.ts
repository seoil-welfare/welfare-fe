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
  DiaryQuery,
  LoginInput,
  SaveDiaryInput,
  ServiceUserInput,
  SignupInput,
  StaffInput,
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
  news: ["news"] as const,
  newsSince: (since: string) => ["news", since] as const,
  serviceUsers: ["serviceUsers"] as const,
  staff: ["staff"] as const,
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

export function useSignup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SignupInput) => api.auth.signup(input),
    // 담당자 목록에 바로 보이게 한다
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.staff }),
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

export function useNews(since: string) {
  return useQuery({
    queryKey: queryKeys.newsSince(since),
    queryFn: () => api.news.list({ since }),
    placeholderData: (previous) => previous,
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
      void client.invalidateQueries({ queryKey: queryKeys.news });
    },
    onError: () => refetchAfterFailure(client, [queryKeys.diaries, queryKeys.news]),
  });
}

export function useCreateServiceUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ServiceUserInput) => api.serviceUsers.create(input),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.serviceUsers }),
    onError: () => refetchAfterFailure(client, [queryKeys.serviceUsers]),
  });
}

export function useUpdateServiceUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: ServiceUserInput }) =>
      api.serviceUsers.update(userId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.serviceUsers }),
  });
}

export function useCloseServiceUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.serviceUsers.close(userId),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.serviceUsers }),
  });
}

export function useCreateStaff() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffInput) => api.staff.create(input),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.staff }),
    onError: () => refetchAfterFailure(client, [queryKeys.staff]),
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
