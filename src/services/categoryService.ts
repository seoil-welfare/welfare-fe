import type { Categories, CategoryItem } from "@/api/types";
import {
  BEHAVIOR_DETAILS,
  BEHAVIOR_TYPES,
  CONDITIONS,
  OTHER_LABEL,
  PARTICIPATION_OPTIONS,
  POSITIVE_SUPPORT_OPTIONS,
  PRE_SUPPORT_OPTIONS,
  REACTION_OPTIONS,
  WEATHERS,
  type BehaviorDetailOption,
} from "@/data/catalog";
import type { BehaviorType } from "@/types";

/**
 * 선택 항목(GET /categories) 계산.
 * 화면은 useCategoryChoices로 서버 목록을 받고, 받기 전·실패하면 defaultCategories(catalog.ts)를 쓴다.
 */

function toItems(labels: readonly string[]): CategoryItem[] {
  // 기본 목록은 코드가 없어 라벨을 코드로 쓴다
  return labels.map((label, index) => ({
    code: label,
    label,
    order: index + 1,
    active: true,
    etc: label === OTHER_LABEL,
  }));
}

/** catalog.ts를 서버 응답 모양으로. 서버 목록을 받기 전 기본값으로 쓴다 */
export function defaultCategories(): Categories {
  return {
    weather: toItems(WEATHERS),
    condition: toItems(CONDITIONS),
    participation: toItems(PARTICIPATION_OPTIONS),
    preSupport: toItems(PRE_SUPPORT_OPTIONS),
    reaction: toItems(REACTION_OPTIONS),
    positiveSupport: toItems(POSITIVE_SUPPORT_OPTIONS),
    behaviorTypes: BEHAVIOR_TYPES.map((t, index) => ({ code: t.type, label: t.label, order: index + 1 })),
    behaviorDetails: Object.fromEntries(
      Object.entries(BEHAVIOR_DETAILS).map(([type, details]) => [
        type,
        details.map((d, index) => ({
          code: d.id,
          label: d.label,
          order: index + 1,
          active: true,
          etc: d.label === OTHER_LABEL,
        })),
      ]),
    ),
  };
}

/** 띄어쓰기만 다른 라벨은 같은 항목으로 본다 (백엔드 Catalog.byLabel과 같음) */
function sameLabel(a: string, b: string): boolean {
  return a.replaceAll(" ", "") === b.replaceAll(" ", "");
}

/**
 * 화면에 보일 선택지 라벨. 숨긴 항목은 빼되, 이미 고른 값이면 남겨서 수정 화면에서 보이게 한다.
 * 고른 값은 서버 라벨로 바꾸지 않는다. 저장 값이 바뀌지 않게 하기 위해서다.
 */
export function choiceLabels(items: readonly CategoryItem[], selected: readonly string[] = []): string[] {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .filter((item) => item.active || selected.some((value) => sameLabel(value, item.label)))
    .map((item) => selected.find((value) => sameLabel(value, item.label)) ?? item.label);
}

/** 도전적 행동 세부 항목 선택지. 숨긴 항목은 이미 고른 경우만 남긴다 */
export function behaviorDetailChoices(
  categories: Categories,
  type: BehaviorType,
  selectedIds: readonly string[] = [],
): BehaviorDetailOption[] {
  return [...(categories.behaviorDetails[type] ?? [])]
    .sort((a, b) => a.order - b.order)
    .filter((item) => item.active || selectedIds.includes(item.code))
    .map((item) => ({ id: item.code, label: item.label }));
}
