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
import type { CardPick, GuardianCard, PickHow, Pictogram, TodayCard, TodayCardItem } from "@/types/todayCard";

/**
 * 프론트가 기대하는 API 계약.
 * http(src/api/http) 구현이 이 인터페이스를 따른다.
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
  /** 오늘 카드 별칭 (20자까지). 보내지 않으면 서버가 그대로 둔다. 빈 문자열이면 지운다 */
  cardNickname?: string;
  /** 보호자 오늘 카드 수신 동의. 보내지 않으면 서버가 그대로 둔다 */
  cardConsent?: boolean;
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
  /**
   * 작성 중인 일지 삭제 (204). 작성자 또는 팀장·국장만.
   * 없으면 404, 작성 완료 일지는 400 VALIDATION_ERROR, 권한이 없으면 403 FORBIDDEN
   */
  delete(diaryId: string): Promise<void>;
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
  /** 팀장·국장만 종결을 취소하고 기존 이용자를 다시 활성화한다 */
  reopen(userId: string): Promise<ServiceUser>;
}

/** 계정 추가 응답. 임시 비밀번호는 이 응답에서만 받을 수 있다 */
export interface CreatedStaff extends Staff {
  temporaryPassword: string;
}

export interface StaffApi {
  /** 사용 중지된 직원도 포함한다 (과거 일지 작성자 이름 표시용) */
  list(): Promise<Staff[]>;
  /** 서버가 만든 임시 비밀번호를 응답에 한 번만 담는다 */
  create(input: StaffInput): Promise<CreatedStaff>;
  /** 계정 사용 중지(false)·다시 사용(true). 팀장·국장만, 내 계정은 중지 못 함 */
  setActive(staffId: string, active: boolean): Promise<Staff>;
  /** 임시 비밀번호 다시 발급. 팀장·국장만, 내 계정·사용 중지된 계정은 못 함. 국장 계정은 국장만 */
  resetPassword(staffId: string): Promise<CreatedStaff>;
  /** 역할 변경 (담당자 ↔ 팀장). 팀장·국장만, 국장·내 계정·중지된 계정은 못 바꿈 */
  changeRole(staffId: string, role: ChangeableRole): Promise<Staff>;
  /** 관리 권한 이양. 국장만. previousRole이 deactivate면 서버가 내 세션을 끊는다 */
  transferDirector(staffId: string, previousRole: PreviousDirectorRole): Promise<DirectorTransferResult>;
}

/** 역할 변경으로 줄 수 있는 역할. 국장은 이양으로만 된다 */
export type ChangeableRole = Exclude<UserRole, "director">;

/** 이양 뒤 원래 국장: 팀장으로 남기 / 계정 사용 중지(역할은 팀장) */
export type PreviousDirectorRole = "teamLead" | "deactivate";

export interface DirectorTransferResult {
  director: Staff; // 새 국장
  previous: Staff; // 원래 국장 (나)
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
  /** 참여 활동만: 오늘 카드 기본 그림 (AI가 고른 그림이 목록 밖이면 이 값을 쓴다) */
  pictogram?: Pictogram;
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
  /** 오늘 카드 기본 그림 */
  pictogram?: Pictogram;
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

/** 오늘 카드 수정. 바꿀 수 있는 것은 문장과 '따로 연락' 표시뿐이다. 그림·표정·시간은 일지에서 온다 */
export interface TodayCardUpdate {
  /** 마지막으로 읽은 카드의 updatedAt. 그사이 다른 사람이 고쳤으면 409 CARD_UPDATED_BY_OTHER */
  updatedAt: string;
  items: Pick<TodayCardItem, "id" | "easyText" | "guardianText" | "homeTip">[];
  needsCall: boolean;
}

/** 오늘 카드 (담당자, 로그인 필요). 일지 작성 완료 시 서버가 AI로 만든다 */
export interface TodayCardApi {
  /** 아직 완료되지 않은 일지면 404 CARD_NOT_FOUND */
  get(diaryId: string): Promise<TodayCard>;
  /** 보낸 카드는 고칠 수 없다(400 CARD_ALREADY_SENT) */
  update(diaryId: string, input: TodayCardUpdate): Promise<TodayCard>;
  /** 실패했거나(failed) 일지가 바뀐(outdated) 카드를 다시 만든다. status=generating으로 돌려준다 */
  regenerate(diaryId: string): Promise<TodayCard>;
  /** 공유 링크를 만든다(문자는 보내지 않음). 응답의 shareUrl을 담당자가 보호자에게 보낸다. 7일 뒤 만료. 이용자 카드 수신 동의가 없으면 400 GUARDIAN_NOT_READY */
  send(diaryId: string): Promise<TodayCard>;
}

/** 보호자가 고른 결과. 고르지 않았으면 skipped=true만 보낸다 */
export interface CardPickInput {
  itemId?: string;
  how?: PickHow;
  skipped: boolean;
}

/** 오늘 카드 (보호자, 로그인 없이 링크 토큰으로) */
export interface GuardianCardApi {
  /**
   * 보호자 확인 전이면 403 CARD_VERIFY_REQUIRED, 만료면 410 CARD_EXPIRED, 없는 링크면 404.
   * 401은 쓰지 않는다. 401은 앱이 '직원 로그인 만료'로 보고 로그인 화면으로 보낸다
   */
  get(token: string): Promise<GuardianCard>;
  /** 이용자 생년월일 4자리(MMDD)로 보호자 확인. 맞으면 이 링크용 쿠키를 준다. 틀리면 400 CARD_VERIFY_FAILED */
  verify(token: string, birthMmdd: string): Promise<void>;
  pick(token: string, input: CardPickInput): Promise<CardPick>;
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
  todayCards: TodayCardApi;
  guardianCards: GuardianCardApi;
}
