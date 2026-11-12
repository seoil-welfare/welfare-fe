/**
 * 화면이 요구하는 값만 정의한다 (지시서 3장).
 * userId / authorId는 이름이 아닌 식별자로 연결한다.
 */

export type UserRole = "staff" | "teamLead" | "director";

/** 직위는 국장·팀장·담당자 세 가지다 (회의 결정). 권한(role)에서 정해진다 */
export const ROLE_POSITION: Record<UserRole, string> = {
  staff: "담당자",
  teamLead: "팀장",
  director: "국장",
};

export interface Staff {
  id: string;
  /** 가상 직원 이름 — 실존 직원이 아니다 */
  name: string;
  department: string;
  /** 직위 표기. 원본에서 확인된 값은 '팀장'뿐이며 '국장'은 U4 미확정 예시다 */
  position: string;
  role: UserRole;
  loginId: string;
  /** YYYY-MM-DD. 회원가입 때 받는다 */
  birthDate?: string;
  /** false면 사용 중지된 계정. 서버는 항상 보내고, mock 기본 데이터는 생략(= 사용 중) */
  active?: boolean;
  /** U4 미확정 예시 직위임을 화면에서 표시하기 위한 플래그 */
  unconfirmedPosition?: boolean;
  /** 임시 비밀번호로 로그인한 상태. true면 비밀번호를 바꾸기 전까지 앱을 쓸 수 없다 */
  mustChangePassword?: boolean;
}

export interface ServiceUser {
  id: string;
  name: string;
  /** YYYY-MM-DD (U6 권장안) */
  birthDate: string;
  assignedStaffId: string;
  /** 이용 종결은 삭제가 아니다. 과거 일지는 유지한다 */
  status: "active" | "closed";
  /** 오늘 카드에 보이는 별칭. 없으면 카드에 '이용자'로 보인다 (실명은 카드에 쓰지 않음) */
  cardNickname?: string;
  /** 보호자 오늘 카드 수신 동의. 없으면 공유 링크를 만들 수 없다 */
  cardConsent?: boolean;
  /** 동의를 등록한 시각 */
  cardConsentAt?: string;
}

export type Weather = "맑음" | "구름조금" | "흐림" | "비" | "눈";
export type Condition = "양호" | "보통" | "저조" | "관찰요망" | "기타";

export type BehaviorType = "selfHarm" | "otherHarm" | "destruction" | "other";

export interface BehaviorSelection {
  type: BehaviorType;
  /** 세부 행동 코드 목록. 상위 'other' 유형은 세부 목록 없이 otherText만 쓴다 */
  detailIds: string[];
  /** 세부 '기타' 또는 상위 '기타'의 직접 입력 */
  otherText?: string;
}

export interface Activity {
  id: string;
  /** HH:mm (24시간제) */
  startTime?: string;
  endTime?: string;
  /** 참여 활동 (복수 선택) */
  participation: string[];
  participationOther?: string;
  detail: string;
  /** 사전 지원 (복수 선택, '없음' 배타 — U2_REVIEW) */
  preSupport: string[];
  preSupportOther?: string;
  /** 이용자 반응 — 참여 정도 1개, 기타 별도 허용 */
  reaction: string[];
  reactionOther?: string;
  /** 긍정행동지원 — 단일/복수 미확정(FR-23). 시연은 복수 칩 */
  positiveSupport: string[];
  positiveSupportOther?: string;
  /** 도전적 행동 상위 '있음' 토글 */
  hasBehavior: boolean;
  behaviors: BehaviorSelection[];
}

export type DiaryStatus = "draft" | "completed";

export interface Diary {
  id: string;
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  authorId: string;
  lastEditorId?: string;
  status: DiaryStatus;
  weather: Weather;
  condition: Condition;
  conditionOther?: string;
  activities: Activity[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type DiaryEventKind = "created" | "updated";

export interface DiaryEvent {
  id: string;
  diaryId: string;
  kind: DiaryEventKind;
  actorId: string;
  /** ISO datetime */
  occurredAt: string;
}

export type StatPeriodUnit = "week" | "month" | "quarter" | "year";

export interface StatisticPeriod {
  unit: StatPeriodUnit;
  year: number;
  /** month: 1~12 */
  month?: number;
  /** quarter: 1~4 */
  quarter?: number;
  /** week: 해당 월의 N주차 */
  week?: number;
}

/** 작성 중인 일지의 임시 데이터 (저장 전) */
export interface DiaryDraft {
  /** 기존 일지를 이어 쓰는 경우의 원본 id */
  diaryId?: string;
  /** 작성 완료된 일지를 수정하는 중이다. 저장 요청에는 넣지 않는다 */
  editingCompleted?: boolean;
  /**
   * 자동 임시저장으로 서버에 처음 만들어진 일지다 (diaryId는 그때 받은 값).
   * 이어 쓰는 일지와 구분하려고 둔다. 저장 요청에는 넣지 않는다
   */
  autosaved?: boolean;
  /**
   * 불러오거나 마지막으로 저장한 일지의 updatedAt. 수정(PUT)할 때 그대로 보낸다.
   * 그사이 다른 사람이 저장했으면 서버가 409 DIARY_UPDATED_BY_OTHER로 거절한다 (명세 4.6)
   */
  updatedAt?: string;
  userId: string;
  date: string;
  weather: Weather;
  condition: Condition;
  conditionOther?: string;
  activities: Activity[];
  notes: string;
}

export interface CountItem {
  label: string;
  count: number;
}
