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
 * 도전적 행동 세부 항목 (FR-27). 복지관 확정 목록이며 순서도 그대로다 (복지관 답변 2, '타인' 표현 제외).
 * id는 백엔드 behavior_item.code와 같다. '기타'는 내용을 직접 적는다.
 */
export const BEHAVIOR_DETAILS: Record<BehaviorType, readonly BehaviorDetailOption[]> = {
  otherHarm: [
    { id: "oh-1", label: "때리기" },
    { id: "oh-2", label: "발로 차기" },
    { id: "oh-3", label: "물기" },
    { id: "oh-4", label: "꼬집기" },
    { id: "oh-5", label: "할퀴기" },
    { id: "oh-6", label: "밀치기" },
    { id: "oh-7", label: "침뱉기" },
    { id: "oh-8", label: "머리카락 잡아당기기" },
    { id: "oh-9", label: "물건을 던져 위협 또는 상해를 가하는 행동" },
    { id: "oh-other", label: "기타" },
  ],
  selfHarm: [
    { id: "sh-1", label: "머리 때리기" },
    { id: "sh-2", label: "얼굴 때리기" },
    { id: "sh-3", label: "손 물기" },
    { id: "sh-4", label: "신체 부위 깨물기" },
    { id: "sh-5", label: "머리 쥐어뜯기" },
    { id: "sh-6", label: "머리 박기" },
    { id: "sh-7", label: "피부 뜯기 및 상처 파기" },
    { id: "sh-8", label: "신체를 벽이나 바닥 등에 부딪히기" },
    { id: "sh-9", label: "꼬집기" },
    { id: "sh-10", label: "귀·눈·코·입 등 신체 부위 파기" },
    { id: "sh-other", label: "기타" },
  ],
  destruction: [
    { id: "ds-1", label: "물건 던지기" },
    { id: "ds-2", label: "물건 내리치기" },
    { id: "ds-3", label: "물건 밟거나 짓누르기" },
    { id: "ds-4", label: "물건 찢기" },
    { id: "ds-5", label: "물건 부수기" },
    { id: "ds-6", label: "가구·시설물 손상시키기" },
    { id: "ds-7", label: "물건을 잡아당기거나 뜯어내기" },
    { id: "ds-8", label: "물건을 뒤엎거나 쏟기" },
    { id: "ds-other", label: "기타" },
  ],
  other: [],
};

export function behaviorDetailLabel(type: BehaviorType, detailId: string): string {
  return BEHAVIOR_DETAILS[type].find((d) => d.id === detailId)?.label ?? detailId;
}

/**
 * 활동 시간 (FR-18). 복지관 양식 기준 10:00~17:00, 30분 단위 (기능명세서 8.5).
 * 시작 시간 하나만 고르면 종료는 30분 뒤로 정해진다.
 */
export const ACTIVITY_FIRST_HOUR = 10;
export const ACTIVITY_LAST_HOUR = 17;
export const ACTIVITY_SLOT_MINUTES = 30;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** HH:mm에 분을 더한다. 마지막 시각(17:00)을 넘지 않는다 */
export function addActivityMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, ACTIVITY_LAST_HOUR * 60);
  return pad2(Math.floor(total / 60)) + ":" + pad2(total % 60);
}

export interface ActivitySlot {
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
}

/** 고를 수 있는 활동 시간 칸: 10:00~10:30 … 16:30~17:00 */
export const ACTIVITY_SLOTS: readonly ActivitySlot[] = Array.from(
  { length: ((ACTIVITY_LAST_HOUR - ACTIVITY_FIRST_HOUR) * 60) / ACTIVITY_SLOT_MINUTES },
  (_, i) => {
    const start = pad2(ACTIVITY_FIRST_HOUR + Math.floor((i * ACTIVITY_SLOT_MINUTES) / 60)) + ":" + pad2((i * ACTIVITY_SLOT_MINUTES) % 60);
    return { start, end: addActivityMinutes(start, ACTIVITY_SLOT_MINUTES) };
  },
);

/** 동일 건수 항목의 정렬 기준이 되는 사전 정의 순서 (통계 집계 공통 규칙 4) */
export const CATEGORY_ORDER: Record<string, readonly string[]> = {
  participation: PARTICIPATION_OPTIONS,
  reaction: REACTION_OPTIONS,
  preSupport: PRE_SUPPORT_OPTIONS,
  positiveSupport: POSITIVE_SUPPORT_OPTIONS,
  condition: CONDITIONS,
};
