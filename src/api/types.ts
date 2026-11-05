import type {
  BehaviorType,
  CountItem,
  Diary,
  DiaryDraft,
  DiaryEvent,
  DiaryStatus,
  ServiceUser,
  Staff,
  StatisticPeriod,
  UserRole,
} from "@/types";

/**
 * 프론트가 기대하는 API 계약.
 * mock(src/api/mock)과 http(src/api/http) 구현이 같은 인터페이스를 따른다.
 * 엔드포인트·필드 상세는 docs/backend-integration.md에 정리한다.
 *
 * 공통 약속
 * - 날짜는 'YYYY-MM-DD'(한국 시간 기준 업무일), 시각은 오프셋이 붙은 ISO 8601 문자열
 * - id는 서버가 발급한다. 프론트가 만드는 활동 id는 저장 전 임시 키다
 * - 실패는 ApiError(status, code, message)로 던진다
 */

export interface LoginInput {
  loginId: string;
  password: string;
  /** FR-02 자동 로그인 */
  autoLogin: boolean;
}

/** 회원가입. 가입만 하고 로그인은 따로 한다 */
export interface SignupInput {
  loginId: string;
  password: string;
  name: string;
  /** YYYY-MM-DD */
  birthDate: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface DiaryQuery {
  userId?: string;
  /** 포함 */
  from?: string;
  /** 포함 */
  to?: string;
  status?: DiaryStatus;
}

/** 일지 저장. diaryId가 없으면 새로 만들고, 있으면 갱신한다 */
export interface SaveDiaryInput extends DiaryDraft {
  status: DiaryStatus;
}

export interface NewsQuery {
  /** 이 날짜(포함) 이후에 발생한 등록·수정 내역 */
  since: string;
}

/** 소식 목록에 필요한 일지 요약. 일지 전체를 내려 줄 필요는 없다 */
export type DiaryRef = Pick<Diary, "id" | "userId" | "date">;

export interface NewsEntry {
  event: DiaryEvent;
  diary: DiaryRef;
}

export interface CalendarQuery {
  /** 포함. 최대 42일 */
  from: string;
  /** 포함 */
  to: string;
}

/** 날짜별 일지 수. 일지가 없는 날은 응답에 없다 */
export interface CalendarDayCount {
  date: string;
  completed: number;
  draft: number;
  /** 대상 이용자 수 (현재 이용 중) */
  target: number;
  hasBehavior: boolean;
}

/** 그날 이용자별 일지 상태. 현재 이용 중인 이용자만 */
export interface CalendarClientStatus {
  clientId: string;
  clientName: string;
  status: DiaryStatus | "none";
  diaryId?: string;
  authorId?: string;
  behaviorCount: number;
  /** 그날 일지가 없으면 true (이용자 1명당 하루 1건) */
  canCreate: boolean;
}

export interface ServiceUserInput {
  name: string;
  birthDate: string;
  assignedStaffId: string;
}

/** 계정 추가. 역할은 항상 담당자(staff)다. 팀장은 역할 변경으로 바꾼다 */
export interface StaffInput {
  name: string;
  loginId: string;
  department: string;
  position: string;
  role: Extract<UserRole, "staff">;
}

export interface AuthApi {
  login(input: LoginInput): Promise<Staff>;
  /** 아이디가 겹치면 409 DUPLICATE_LOGIN_ID, 비밀번호 규칙 위반이면 400 PASSWORD_POLICY */
  signup(input: SignupInput): Promise<Staff>;
  logout(): Promise<void>;
  /** 로그인 상태가 아니면 null */
  me(): Promise<Staff | null>;
  changePassword(input: ChangePasswordInput): Promise<void>;
}

export interface DiaryApi {
  list(query: DiaryQuery): Promise<Diary[]>;
  /** 없으면 404 ApiError */
  get(diaryId: string): Promise<Diary>;
  save(input: SaveDiaryInput): Promise<Diary>;
}

export interface StatsQuery extends StatisticPeriod {
  userId: string;
}

/** 통계 한 기간의 집계. 통계 화면 4개가 이 응답 하나로 그린다 (GET /stats/summary) */
export interface StatsSummary {
  period: { unit: StatisticPeriod["unit"]; label: string; start: string; end: string };
  /** 기간 안의 작성 완료 일지 수 */
  completedDiaries: number;
  behavior: {
    /** 세부 행동 선택 건수 합계 (FR-32) */
    count: number;
    /** 발생 일수 (FR-33) */
    days: number;
    /** 이전 동기간 대비 증감 (FR-34) */
    delta: number;
    /** 이전 동기간에 기록이 없었는지 */
    previousEmpty: boolean;
    byType: Record<BehaviorType, number>;
    /** 유형 필터로 요약을 바꿀 때 쓰는 유형별 요약 (FR-47) */
    typeSummary: Record<BehaviorType, { count: number; days: number; delta: number }>;
    /** 추이 그래프 (FR-35), 오래된 구간부터 */
    trend: { label: string; count: number; isCurrent: boolean }[];
    /** 세부 행동별 건수 (FR-48). 1건 이상만. 상위 '기타'는 detailId가 "other" */
    details: { type: BehaviorType; detailId: string; count: number }[];
    /** 발생 기록 최신순 (FR-49). 도전적 행동이 있었던 활동 1개가 1줄 */
    records: StatsBehaviorRecord[];
  };
  /** 항목별 건수. 많은 순, 같으면 목록 순서. 0건 항목도 들어 있다 */
  participation: CountItem[];
  reaction: CountItem[];
  preSupport: CountItem[];
  positiveSupport: CountItem[];
  /** 컨디션은 일지 기준 */
  condition: CountItem[];
  /** 참여 활동 상세 (FR-53, 55, 56) */
  activities: {
    totalCount: number;
    kindCount: number;
    /** '기타' 직접 입력 건수 */
    otherCount: number;
    /** 활동별 도전적 행동 건수 (0건 포함) */
    behaviorByParticipation: CountItem[];
    /** 참여 활동마다 이용자 반응 건수 (반응 전체, 0건 포함) */
    reactionByParticipation: { label: string; reaction: CountItem[] }[];
  };
}

export interface StatsBehaviorRecord {
  diaryId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  activityId: string;
  /** 유형 순서 → 목록 순서. otherText는 상위 '기타'의 직접 입력 */
  behaviors: { type: BehaviorType; detailId: string; otherText?: string }[];
}

export interface StatsApi {
  /** 이용자가 없거나 형식이 틀리면 400 */
  summary(query: StatsQuery): Promise<StatsSummary>;
}

export interface CalendarApi {
  days(query: CalendarQuery): Promise<CalendarDayCount[]>;
  clientStatuses(date: string): Promise<CalendarClientStatus[]>;
}

export interface NewsApi {
  /** 발생 시각 최신순 */
  list(query: NewsQuery): Promise<NewsEntry[]>;
}

export interface ServiceUserApi {
  /** 이용 종결된 이용자도 포함한다 (과거 일지 표시용) */
  list(): Promise<ServiceUser[]>;
  create(input: ServiceUserInput): Promise<ServiceUser>;
  update(userId: string, input: ServiceUserInput): Promise<ServiceUser>;
  /** 종결은 삭제가 아니다 (FR-91) */
  close(userId: string): Promise<ServiceUser>;
}

export interface StaffApi {
  /** 사용 중지된 직원도 포함한다 (과거 일지 작성자 이름 표시용) */
  list(): Promise<Staff[]>;
  create(input: StaffInput): Promise<Staff>;
  /** 계정 사용 중지(false)·다시 사용(true). 팀장·국장만, 내 계정은 중지 못 함 */
  setActive(staffId: string, active: boolean): Promise<Staff>;
}

/** 선택 항목 1개. 일지에는 아직 label을 저장한다 (code 저장 전환은 B-4) */
export interface CategoryItem {
  code: string;
  label: string;
  order: number;
  /** false면 새 일지에서는 숨긴다. 과거 일지·통계에는 그대로 남는다 */
  active: boolean;
  /** '기타'면 true (직접 입력칸) */
  etc: boolean;
}

/** GET /categories. 숨긴 항목도 함께 온다 */
export interface Categories {
  weather: CategoryItem[];
  condition: CategoryItem[];
  participation: CategoryItem[];
  preSupport: CategoryItem[];
  reaction: CategoryItem[];
  positiveSupport: CategoryItem[];
  behaviorTypes: { code: string; label: string; order: number }[];
  /** 도전적 행동 유형 코드 → 세부 항목. code는 BEHAVIOR_DETAILS의 id와 같다 */
  behaviorDetails: Record<string, CategoryItem[]>;
}

/** 참여 활동 이름 변경·숨기기. 보내지 않은 칸은 바꾸지 않는다 */
export interface ParticipationUpdate {
  label?: string;
  active?: boolean;
}

export interface CategoryApi {
  list(): Promise<Categories>;
  /** 팀장·국장만. '기타' 바로 앞에 들어간다. 이름이 겹치면 409 DUPLICATE_CATEGORY */
  addParticipation(label: string): Promise<CategoryItem>;
  /** 팀장·국장만. '기타'는 숨길 수 없다(400) */
  updateParticipation(code: string, input: ParticipationUpdate): Promise<CategoryItem>;
}

/** 헤더 종 아이콘용. 마지막으로 읽은 뒤 다른 직원이 등록·수정한 소식 수 */
export interface NotificationSummary {
  unreadCount: number;
  /** 한 번도 읽지 않았으면 없다 */
  lastReadAt?: string;
}

export interface NotificationSettings {
  /** 새 일지 알림 받기 (마이페이지 스위치) */
  notifyNewLog: boolean;
}

export interface NotificationApi {
  summary(): Promise<NotificationSummary>;
  /** 전부 읽음. 소식 화면을 열 때 부른다 */
  markAllRead(): Promise<void>;
  settings(): Promise<NotificationSettings>;
  updateSettings(input: NotificationSettings): Promise<NotificationSettings>;
}

export interface Api {
  auth: AuthApi;
  diaries: DiaryApi;
  calendar: CalendarApi;
  stats: StatsApi;
  news: NewsApi;
  serviceUsers: ServiceUserApi;
  staff: StaffApi;
  notifications: NotificationApi;
  categories: CategoryApi;
}
