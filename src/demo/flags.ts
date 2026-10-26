/**
 * DEMO_ONLY 플래그.
 * 회의에서 확정되지 않은 동작을 관찰·비교하기 위한 시연 전용 설정이다.
 * 여기 있는 기본값은 승인된 정책이 아니다 (지시서 0-7).
 */

export interface DemoFlags {
  /**
   * DEMO_ONLY — 달력 날짜 셀 지표.
   * 'completion': 완료 일지 수 N/3 (이번 회의 제안안, 기본값)
   * 'gauge': 기존 UI 가이드 7장의 원형 게이지 (비교용)
   * 어느 쪽도 승인된 방식이 아니다 (지시서 4.3).
   */
  calendarIndicator: "completion" | "gauge";

  /**
   * DEMO_ONLY(U1) — 상단 '임시저장' 버튼의 동작.
   * 'stay': 저장 후 화면에 머무르며 알림만 표시 (지시서 3장 지정 시연안)
   */
  tempSaveBehavior: "stay";

  /**
   * U2_REVIEW — 사전 지원 '없음' 배타 선택.
   * 계획서 FR-21에 정의되어 있으나 가이드 U2에서 재확인이 필요하다.
   */
  exclusiveNone: boolean;

  /**
   * 미확정 제안 — 도전적 행동 상세 통계에서 유형 필터가 상단 요약까지 바꾸는지 여부.
   */
  behaviorFilterUpdatesSummary: boolean;

  /** 관찰용 상태: 오늘의 소식을 0건으로 비운다 */
  forceEmptyNews: boolean;

  /** 관찰용 상태: 통계를 0건으로 비운다 */
  forceEmptyStats: boolean;

  /** 관찰용 상태: 불러오기 실패 화면을 재현한다 */
  forceLoadFailure: boolean;

  /** 관찰용 상태: 첫 로딩 Skeleton을 길게 보여 준다 */
  slowLoading: boolean;

  /** 새로고침 후에도 데모 상태를 유지한다 (localStorage) */
  persist: boolean;
}

export const DEFAULT_FLAGS: DemoFlags = {
  calendarIndicator: "completion",
  tempSaveBehavior: "stay",
  exclusiveNone: true,
  behaviorFilterUpdatesSummary: true,
  forceEmptyNews: false,
  forceEmptyStats: false,
  forceLoadFailure: false,
  slowLoading: false,
  // 새로고침해도 로그인·작성 내용이 유지되게 기본으로 켠다 (목 데이터는 가짜라 브라우저 저장 무방)
  persist: true,
};

/**
 * 회의 대조용 메모.
 * 활동 수는 '활동 N건'으로 표기하고 원본의 'N/7'은 쓰지 않는다 (지시서 4.2 / FR-17 미확정).
 */
export const MEMO_ACTIVITY_LIMIT =
  "원본 목업의 '활동 입력 N/7' 표기는 하루 최대 활동 개수 제한이 미확정이므로 '활동 N건'으로 바꿔 표시합니다. (계획서 FR-17 미확정 사항)";

/** 이 프로토타입이 구현하지 않는 범위 안내 */
export const SCOPE_NOTICE =
  "이 화면은 UI 시연 프로토타입입니다. 실제 서버 저장·인증·문서 생성은 하지 않습니다.";
