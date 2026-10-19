import type {
  Diary,
  DiaryDraft,
  DiaryEvent,
  DiaryStatus,
  ServiceUser,
  Staff,
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
  role: UserRole;
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

export interface StaffInput {
  name: string;
  loginId: string;
  department: string;
  position: string;
  role: UserRole;
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
  list(): Promise<Staff[]>;
  create(input: StaffInput): Promise<Staff>;
}

export interface Api {
  auth: AuthApi;
  diaries: DiaryApi;
  calendar: CalendarApi;
  news: NewsApi;
  serviceUsers: ServiceUserApi;
  staff: StaffApi;
}
