import type { BehaviorType, Condition, Weather } from "@/types";

/**
 * 선택 항목 카탈로그.
 * 여기 있는 값은 모두 개발계획서 FR에 명시된 목록이다.
 * 계획서/가이드에 없는 목록은 EXAMPLE_ONLY로 표시한다 (지시서 4.2).
 */

/** FR-10 — 기본값 '맑음' */
export const WEATHERS: readonly Weather[] = ["맑음", "구름조금", "흐림", "비", "눈"];

/** FR-11 — 기본값 '양호', '기타' 선택 시 직접 입력 */
export const CONDITIONS: readonly Condition[] = ["양호", "보통", "저조", "관찰요망", "기타"];

/** FR-19 — 복수 선택, 기본 미선택 */
export const PARTICIPATION_OPTIONS = [
  "일상생활훈련",
  "예술활동",
  "체육활동",
  "선호활동",
  "지역참여활동",
  "요리활동",
  "현장학습",
  "기타",
] as const;

/** FR-21 — 복수 선택, '없음' 배타 (U2_REVIEW) */
export const PRE_SUPPORT_OPTIONS = [
  "강화물",
  "활동준비",
  "활동안내",
  "선택지제공",
  "모델링",
  "안전교육",
  "휴식",
  "없음",
  "기타",
] as const;

/** FR-22 — 선택 가능 개수 미확정. 시연은 복수 선택 칩 */
export const REACTION_OPTIONS = [
  "적극적 참여",
  "안정적 참여",
  "부분적 참여",
  "참여하지 않음",
  "기타",
] as const;

/** FR-23 — 선택 가능 개수 미확정. 시연은 복수 선택 칩 */
export const POSITIVE_SUPPORT_OPTIONS = [
  "강화물",
  "언어 촉진 및 격려",
  "선택지 제공",
  "휴식",
  "대체행동 지원",
  "기타",
] as const;

/** '없음' 배타 동작의 대상 그룹. 글자가 '없음'이라는 이유로 모든 그룹에 적용하지 않는다 (가이드 9장 5번) */
export const EXCLUSIVE_NONE_LABEL = "없음";

export const OTHER_LABEL = "기타";

/** FR-24 / FR-47 — 유형 순서는 계획서 표기를 따른다 */
export interface BehaviorTypeMeta {
  type: BehaviorType;
  label: string;
  /** 상위 '기타'는 상세 화면으로 이동하지 않고 현재 화면에서 직접 입력 (FR-27) */
  hasDetailPage: boolean;
  /** 도넛 차트 고정 색 대응 (가이드 2-3 5번) */
  chartVar: string;
}

export const BEHAVIOR_TYPES: readonly BehaviorTypeMeta[] = [
  { type: "otherHarm", label: "타해", hasDetailPage: true, chartVar: "var(--chart-2)" },
  { type: "selfHarm", label: "자해", hasDetailPage: true, chartVar: "var(--chart-1)" },
  { type: "destruction", label: "파괴행동", hasDetailPage: true, chartVar: "var(--chart-3)" },
  { type: "other", label: "기타", hasDetailPage: false, chartVar: "var(--chart-4)" },
];

/** 도넛 차트 고정 대응: 자해=chart-1, 타해=chart-2, 파괴행동=chart-3, 기타=chart-4 */
export const DONUT_ORDER: readonly BehaviorType[] = [
  "selfHarm",
  "otherHarm",
  "destruction",
  "other",
];

export function behaviorTypeLabel(type: BehaviorType): string {
  return BEHAVIOR_TYPES.find((t) => t.type === type)?.label ?? type;
}

export function behaviorTypeMeta(type: BehaviorType): BehaviorTypeMeta {
  return BEHAVIOR_TYPES.find((t) => t.type === type) ?? BEHAVIOR_TYPES[0];
}

export interface BehaviorDetailOption {
  id: string;
  label: string;
}

/**
 * EXAMPLE_ONLY — 세부 행동 항목의 최종 목록은 개발계획서 FR-27 미확정 사항이다.
 * 첨부 문서에 목록이 명시되어 있지 않으므로, 실제 복지관 정식 항목이 아닌
 * '예시 항목(확정 필요)'으로 화면에 표시한다 (지시서 4.2).
 */
export const BEHAVIOR_DETAILS: Record<BehaviorType, readonly BehaviorDetailOption[]> = {
  otherHarm: [
    { id: "oh-1", label: "예시 항목 A" },
    { id: "oh-2", label: "예시 항목 B" },
    { id: "oh-3", label: "예시 항목 C" },
    { id: "oh-4", label: "예시 항목 D" },
    { id: "oh-other", label: "기타" },
  ],
  selfHarm: [
    { id: "sh-1", label: "예시 항목 A" },
    { id: "sh-2", label: "예시 항목 B" },
    { id: "sh-3", label: "예시 항목 C" },
    { id: "sh-other", label: "기타" },
  ],
  destruction: [
    { id: "ds-1", label: "예시 항목 A" },
    { id: "ds-2", label: "예시 항목 B" },
    { id: "ds-3", label: "예시 항목 C" },
    { id: "ds-other", label: "기타" },
  ],
  other: [],
};

export function behaviorDetailLabel(type: BehaviorType, detailId: string): string {
  return BEHAVIOR_DETAILS[type].find((d) => d.id === detailId)?.label ?? detailId;
}

/** FR-18 — 분 단위 간격은 미확정(추후 협의). 시연은 10분 간격 */
export const MINUTE_STEP_DEMO_ONLY = 10;

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

export const MINUTE_OPTIONS = Array.from(
  { length: Math.floor(60 / MINUTE_STEP_DEMO_ONLY) },
  (_, i) => String(i * MINUTE_STEP_DEMO_ONLY).padStart(2, "0"),
);

/** 동일 건수 항목의 정렬 기준이 되는 사전 정의 순서 (통계 집계 공통 규칙 4) */
export const CATEGORY_ORDER: Record<string, readonly string[]> = {
  participation: PARTICIPATION_OPTIONS,
  reaction: REACTION_OPTIONS,
  preSupport: PRE_SUPPORT_OPTIONS,
  positiveSupport: POSITIVE_SUPPORT_OPTIONS,
  condition: CONDITIONS,
};
