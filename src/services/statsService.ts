import {
  BEHAVIOR_TYPES,
  CATEGORY_ORDER,
  OTHER_LABEL,
  behaviorDetailLabel,
} from "@/data/catalog";
import { addDays, parseISODate, quarterOf, toISODate } from "@/lib/utils";
import { countActivityBehaviors } from "@/services/diaryService";
import type {
  BehaviorType,
  CountItem,
  Diary,
  StatPeriodUnit,
  StatisticPeriod,
} from "@/types";

/**
 * 통계 집계.
 * 계획서 「통계 집계 공통 규칙」을 가능한 한 그대로 적용한다 (지시서 1장 / 3장).
 * - 작성 완료 일지만 포함, 임시 저장 제외
 * - 동일 활동 내 동일 세부 행동은 1건, 다른 행동은 각각 1건
 * - 발생 일수는 날짜 유일값
 * - '기타' 자유 입력은 개별 항목으로 분리하지 않고 '기타'로 합산
 * - 단위는 '회'가 아니라 '건'
 */

export interface PeriodRange {
  /** 포함 */
  start: string;
  /** 포함 */
  end: string;
  label: string;
}

/** 해당 월의 1일이 포함된 주를 1주차로 센다 (주차 계산 방식은 미확정 — 시연 기준) */
function weeksInMonth(year: number, month: number): PeriodRange[] {
  const lastDay = new Date(year, month, 0).getDate();
  const ranges: PeriodRange[] = [];
  let cursor = 1;
  let week = 1;
  while (cursor <= lastDay) {
    const date = new Date(year, month - 1, cursor);
    // 주의 끝(토요일) 또는 월말까지
    const daysToSaturday = 6 - date.getDay();
    const endDay = Math.min(cursor + daysToSaturday, lastDay);
    ranges.push({
      start: toISODate(new Date(year, month - 1, cursor)),
      end: toISODate(new Date(year, month - 1, endDay)),
      label: year + "년 " + month + "월 " + week + "주차",
    });
    cursor = endDay + 1;
    week += 1;
  }
  return ranges;
}

export function weekCountOfMonth(year: number, month: number): number {
  return weeksInMonth(year, month).length;
}

export function periodRange(period: StatisticPeriod): PeriodRange {
  const { unit, year } = period;
  if (unit === "year") {
    return {
      start: toISODate(new Date(year, 0, 1)),
      end: toISODate(new Date(year, 11, 31)),
      label: year + "년",
    };
  }
  if (unit === "quarter") {
    const q = period.quarter ?? 1;
    const startMonth = (q - 1) * 3;
    return {
      start: toISODate(new Date(year, startMonth, 1)),
      end: toISODate(new Date(year, startMonth + 3, 0)),
      label: year + "년 " + q + "분기",
    };
  }
  if (unit === "month") {
    const m = period.month ?? 1;
    return {
      start: toISODate(new Date(year, m - 1, 1)),
      end: toISODate(new Date(year, m, 0)),
      label: year + "년 " + m + "월",
    };
  }
  const m = period.month ?? 1;
  const weeks = weeksInMonth(year, m);
  const index = Math.min(Math.max((period.week ?? 1) - 1, 0), weeks.length - 1);
  return weeks[index];
}

/** 조회 단위를 바꾸면 현재 날짜가 포함된 기간을 기본값으로 설정한다 (기간 선택 규칙 2) */
export function currentPeriod(unit: StatPeriodUnit, todayIso: string): StatisticPeriod {
  const today = parseISODate(todayIso);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  if (unit === "year") return { unit, year };
  if (unit === "quarter") return { unit, year, quarter: quarterOf(month) };
  if (unit === "month") return { unit, year, month };
  const weeks = weeksInMonth(year, month);
  const index = weeks.findIndex((w) => todayIso >= w.start && todayIso <= w.end);
  return { unit, year, month, week: (index < 0 ? 0 : index) + 1 };
}

/** 이전 동일 단위 기간 (FR-34) */
export function previousPeriod(period: StatisticPeriod): StatisticPeriod {
  const { unit, year } = period;
  if (unit === "year") return { unit, year: year - 1 };
  if (unit === "quarter") {
    const q = period.quarter ?? 1;
    return q === 1 ? { unit, year: year - 1, quarter: 4 } : { unit, year, quarter: q - 1 };
  }
  if (unit === "month") {
    const m = period.month ?? 1;
    return m === 1 ? { unit, year: year - 1, month: 12 } : { unit, year, month: m - 1 };
  }
  const m = period.month ?? 1;
  const w = period.week ?? 1;
  if (w > 1) return { unit, year, month: m, week: w - 1 };
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? year - 1 : year;
  return { unit, year: prevYear, month: prevMonth, week: weekCountOfMonth(prevYear, prevMonth) };
}

export function nextPeriod(period: StatisticPeriod): StatisticPeriod {
  const { unit, year } = period;
  if (unit === "year") return { unit, year: year + 1 };
  if (unit === "quarter") {
    const q = period.quarter ?? 1;
    return q === 4 ? { unit, year: year + 1, quarter: 1 } : { unit, year, quarter: q + 1 };
  }
  if (unit === "month") {
    const m = period.month ?? 1;
    return m === 12 ? { unit, year: year + 1, month: 1 } : { unit, year, month: m + 1 };
  }
  const m = period.month ?? 1;
  const w = period.week ?? 1;
  if (w < weekCountOfMonth(year, m)) return { unit, year, month: m, week: w + 1 };
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? year + 1 : year;
  return { unit, year: ny, month: nm, week: 1 };
}

/**
 * 기간 추이 그래프의 구간 수.
 * FR-35 미확정 사항의 제안값: 월 최근 6개월, 분기 최근 4분기, 연간 최근 5년.
 * 주간은 제안값이 없으므로 시연에서 최근 6주차를 사용한다.
 */
export const TREND_SEGMENTS: Record<StatPeriodUnit, number> = {
  week: 6,
  month: 6,
  quarter: 4,
  year: 5,
};

export function trendPeriods(period: StatisticPeriod): StatisticPeriod[] {
  const count = TREND_SEGMENTS[period.unit];
  const out: StatisticPeriod[] = [period];
  let cursor = period;
  for (let i = 1; i < count; i += 1) {
    cursor = previousPeriod(cursor);
    out.unshift(cursor);
  }
  return out;
}

export function completedDiaries(
  diaries: readonly Diary[],
  userId: string,
  range: PeriodRange,
): Diary[] {
  return diaries.filter(
    (d) =>
      d.userId === userId &&
      d.status === "completed" && // 임시 저장 제외
      d.date >= range.start &&
      d.date <= range.end,
  );
}

export interface BehaviorSummary {
  /** 세부 행동 선택 건수 합계 (FR-32) */
  count: number;
  /** 발생 일수 (FR-33) */
  days: number;
  /** 이전 동기간 대비 증감 (FR-34) */
  delta: number;
  /** 이전 동기간에 기록이 없었는지 — 증감 표시 방식 미확정(FR-34) */
  previousEmpty: boolean;
}

export function behaviorSummary(
  diaries: readonly Diary[],
  userId: string,
  period: StatisticPeriod,
  typeFilter: BehaviorType | "all" = "all",
): BehaviorSummary {
  const current = completedDiaries(diaries, userId, periodRange(period));
  const previous = completedDiaries(diaries, userId, periodRange(previousPeriod(period)));
  const count = countBehaviorsIn(current, typeFilter);
  const prevCount = countBehaviorsIn(previous, typeFilter);
  const days = new Set(
    current.filter((d) => countBehaviorsIn([d], typeFilter) > 0).map((d) => d.date),
  ).size;
  return {
    count,
    days,
    delta: count - prevCount,
    previousEmpty: countBehaviorsIn(previous, "all") === 0,
  };
}

export function countBehaviorsIn(
  diaries: readonly Diary[],
  typeFilter: BehaviorType | "all",
): number {
  let total = 0;
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      if (!activity.hasBehavior) continue;
      if (typeFilter === "all") {
        total += countActivityBehaviors(activity);
        continue;
      }
      for (const selection of activity.behaviors) {
        if (selection.type !== typeFilter) continue;
        total +=
          selection.type === "other"
            ? selection.otherText?.trim()
              ? 1
              : 0
            : new Set(selection.detailIds).size;
      }
    }
  }
  return total;
}

/** 유형별 건수 (FR-36 / FR-47) */
export function behaviorCountsByType(
  diaries: readonly Diary[],
): Record<BehaviorType, number> {
  const result: Record<BehaviorType, number> = {
    selfHarm: 0,
    otherHarm: 0,
    destruction: 0,
    other: 0,
  };
  for (const meta of BEHAVIOR_TYPES) {
    result[meta.type] = countBehaviorsIn(diaries, meta.type);
  }
  return result;
}

/** 세부 행동별 건수 (FR-48) */
export function behaviorDetailCounts(
  diaries: readonly Diary[],
  typeFilter: BehaviorType | "all",
): CountItem[] {
  const map = new Map<string, number>();
  const types = typeFilter === "all" ? BEHAVIOR_TYPES.map((t) => t.type) : [typeFilter];

  for (const type of types) {
    if (type === "other") {
      let count = 0;
      for (const diary of diaries) {
        for (const activity of diary.activities) {
          if (!activity.hasBehavior) continue;
          const sel = activity.behaviors.find((b) => b.type === "other");
          if (sel?.otherText?.trim()) count += 1;
        }
      }
      if (typeFilter !== "all" || count > 0) map.set("기타 (직접 입력)", count);
      continue;
    }
    for (const diary of diaries) {
      for (const activity of diary.activities) {
        if (!activity.hasBehavior) continue;
        for (const sel of activity.behaviors.filter((b) => b.type === type)) {
          for (const detailId of new Set(sel.detailIds)) {
            const label = behaviorDetailLabel(type, detailId);
            const key = typeFilter === "all" ? labelWithType(type, label) : label;
            map.set(key, (map.get(key) ?? 0) + 1);
          }
        }
      }
    }
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function labelWithType(type: BehaviorType, label: string): string {
  return (BEHAVIOR_TYPES.find((t) => t.type === type)?.label ?? "") + " · " + label;
}

export type ActivityField =
  | "participation"
  | "reaction"
  | "preSupport"
  | "positiveSupport";

/**
 * 활동별 선택 건수 집계 (FR-38~FR-41).
 * '기타'의 자유 입력은 개별 항목으로 분리하지 않고 '기타'로 합산한다.
 */
export function activityFieldCounts(
  diaries: readonly Diary[],
  field: ActivityField,
  options: { includeZero?: boolean } = {},
): CountItem[] {
  const order = CATEGORY_ORDER[field] ?? [];
  const map = new Map<string, number>();
  if (options.includeZero) order.forEach((label) => map.set(label, 0));

  for (const diary of diaries) {
    for (const activity of diary.activities) {
      for (const label of activity[field] as string[]) {
        map.set(label, (map.get(label) ?? 0) + 1);
      }
    }
  }
  return sortByCountThenOrder(map, order);
}

/** 컨디션은 일지별 선택 건수 (FR-42) */
export function conditionCounts(
  diaries: readonly Diary[],
  options: { includeZero?: boolean } = {},
): CountItem[] {
  const order = CATEGORY_ORDER.condition ?? [];
  const map = new Map<string, number>();
  if (options.includeZero) order.forEach((label) => map.set(label, 0));
  for (const diary of diaries) {
    map.set(diary.condition, (map.get(diary.condition) ?? 0) + 1);
  }
  return sortByCountThenOrder(map, order);
}

function sortByCountThenOrder(
  map: Map<string, number>,
  order: readonly string[],
): CountItem[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const ai = order.indexOf(a.label);
      const bi = order.indexOf(b.label);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
}

/** 참여 활동 상세 요약 (FR-53) */
export interface ParticipationSummary {
  totalCount: number;
  kindCount: number;
  otherCount: number;
}

export function participationSummary(diaries: readonly Diary[]): ParticipationSummary {
  let totalCount = 0;
  let otherCount = 0;
  const kinds = new Set<string>();
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      for (const label of activity.participation) {
        totalCount += 1;
        kinds.add(label);
        if (label === OTHER_LABEL && activity.participationOther?.trim()) otherCount += 1;
      }
    }
  }
  return { totalCount, kindCount: kinds.size, otherCount };
}

/**
 * 참여 활동 카테고리별 도전적 행동 건수 (FR-55).
 * 한 활동에서 여러 카테고리를 선택한 경우의 배분 방식은 미확정이다.
 * 시연에서는 선택된 모든 카테고리에 같은 건수를 계상한다 (중복 계상 가능).
 */
export function behaviorCountsByParticipation(diaries: readonly Diary[]): CountItem[] {
  const order = CATEGORY_ORDER.participation ?? [];
  const map = new Map<string, number>();
  order.forEach((label) => map.set(label, 0)); // 0건도 표시한다 (공통 규칙 3)
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      const behaviorCount = countActivityBehaviors(activity);
      if (behaviorCount === 0) continue;
      for (const label of activity.participation) {
        map.set(label, (map.get(label) ?? 0) + behaviorCount);
      }
    }
  }
  return sortByCountThenOrder(map, order);
}

/** 특정 참여 활동에서 기록된 이용자 반응 (FR-56) */
export function reactionCountsForParticipation(
  diaries: readonly Diary[],
  participationLabel: string,
): CountItem[] {
  const order = CATEGORY_ORDER.reaction ?? [];
  const map = new Map<string, number>();
  order.forEach((label) => map.set(label, 0));
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      if (!activity.participation.includes(participationLabel)) continue;
      for (const label of activity.reaction) {
        map.set(label, (map.get(label) ?? 0) + 1);
      }
    }
  }
  return sortByCountThenOrder(map, order);
}

/** 도전적 행동 발생 기록 (FR-49) */
export interface BehaviorRecord {
  diaryId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  /** 유형 · 세부 행동명 */
  labels: string[];
  activityId: string;
}

export function behaviorRecords(
  diaries: readonly Diary[],
  typeFilter: BehaviorType | "all",
): BehaviorRecord[] {
  const records: BehaviorRecord[] = [];
  for (const diary of diaries) {
    for (const activity of diary.activities) {
      if (!activity.hasBehavior) continue;
      const selections = activity.behaviors.filter(
        (b) => typeFilter === "all" || b.type === typeFilter,
      );
      if (selections.length === 0) continue;
      const labels: string[] = [];
      for (const sel of selections) {
        if (sel.type === "other") {
          if (sel.otherText?.trim()) labels.push("기타 · " + sel.otherText.trim());
          continue;
        }
        for (const detailId of new Set(sel.detailIds)) {
          labels.push(labelWithType(sel.type, behaviorDetailLabel(sel.type, detailId)));
        }
      }
      if (labels.length === 0) continue;
      records.push({
        diaryId: diary.id,
        date: diary.date,
        startTime: activity.startTime,
        endTime: activity.endTime,
        labels,
        activityId: activity.id,
      });
    }
  }
  // 날짜 및 활동 시작 시각 기준 최신순 (발생 기록 규칙 1)
  return records.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.startTime ?? "").localeCompare(a.startTime ?? ""),
  );
}

/** 추이 그래프 데이터 (FR-35) */
export interface TrendPoint {
  label: string;
  count: number;
  isCurrent: boolean;
}

export function behaviorTrend(
  diaries: readonly Diary[],
  userId: string,
  period: StatisticPeriod,
): TrendPoint[] {
  const periods = trendPeriods(period);
  const currentLabel = periodRange(period).label;
  return periods.map((p) => {
    const range = periodRange(p);
    return {
      label: shortPeriodLabel(p),
      count: countBehaviorsIn(completedDiaries(diaries, userId, range), "all"),
      isCurrent: range.label === currentLabel,
    };
  });
}

function shortPeriodLabel(period: StatisticPeriod): string {
  if (period.unit === "month") return (period.month ?? 1) + "월";
  if (period.unit === "quarter") return (period.quarter ?? 1) + "분기";
  if (period.unit === "year") return String(period.year);
  return (period.week ?? 1) + "주차";
}

/** 기간 선택 바텀시트에서 쓰는 선택 가능 연도 범위. 범위는 미확정(FR-30) — 시연 기준 */
export function selectableYears(todayIso: string): number[] {
  const thisYear = parseISODate(todayIso).getFullYear();
  return [thisYear - 2, thisYear - 1, thisYear, thisYear + 1];
}

export function periodLabel(period: StatisticPeriod): string {
  return periodRange(period).label;
}

/** 달력 등에서 쓰는 월 단위 날짜 목록 */
export function monthDates(year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate();
  return Array.from({ length: last }, (_, i) => toISODate(new Date(year, month - 1, i + 1)));
}

export function calendarGrid(year: number, month: number): string[] {
  const first = new Date(year, month - 1, 1);
  const start = toISODate(addDaysDate(first, -first.getDay()));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function addDaysDate(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
